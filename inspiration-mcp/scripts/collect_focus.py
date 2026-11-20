"""One bounded comment-based sample, using the existing collector and its ledger."""
import argparse
import hashlib
import subprocess
import contextlib
import datetime as dt
import io
import json
import os
import re
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(os.environ.get("INSPIRATION_COLLECTOR_DIR", Path(__file__).resolve().parents[2] / "linkedin-agent")).resolve()
sys.path.insert(0, str(ROOT / "scripts"))
from audience_loop_collect import BudgetExhausted, available, collect, request_cost
from audience_loop import BASE, effective_budget


def normalized_body(body):
    normalized = dict(body)
    url = normalized.get("url")
    if isinstance(url, str) and "/in/" in url:
        normalized["url"] = url.rstrip("/")
    return normalized


def read_cached(endpoint, body):
    now = dt.datetime.now(dt.timezone.utc)
    wanted = normalized_body(body)
    for file in (BASE / "cache").glob("*.json"):
        try:
            item = json.loads(file.read_text())
            if (item.get("endpoint") == endpoint and normalized_body(item["input"]) == wanted and
                    dt.datetime.fromisoformat(item["fetched_at"]) <= now < dt.datetime.fromisoformat(item["expires_at"])):
                return item["data"]
        except (ValueError, KeyError, TypeError, OSError):
            continue
    return None


def query(run_id, endpoint, body, grant, max_credits):
    result = io.StringIO()
    with contextlib.redirect_stdout(result):
        collect(run_id, endpoint, normalized_body(body), local_grant=grant, run_limit=max_credits)
    receipt = json.loads(result.getvalue())
    if receipt["status"] == "already_attempted":
        receipt = receipt["record"]
    if receipt["status"] != "complete":
        raise RuntimeError("Collection stopped; inspect journal before proceeding")
    cached = json.loads((ROOT / receipt["cache"]).read_text())
    if dt.datetime.fromisoformat(cached["expires_at"]) <= dt.datetime.now(dt.timezone.utc):
        raise RuntimeError("Expired journal result")
    return cached["data"]


def profile_key(value):
    return value.lower().split("/in/")[-1].strip("/")


def related(text, focus):
    words = set(re.findall(r"\w+", text.lower()))
    subject = "task factory" if re.fullmatch(r"task\s+factor(?:y|ies)\s+for\s+.+", focus.strip(), re.I) else focus
    wanted = set(re.findall(r"\w+", subject.lower()))
    if wanted and wanted <= words:
        return True
    if wanted == {"task", "factory"}:
        workflow = {"workflow", "workflows", "automation", "automations", "automate", "automating"}
        context = {"routine", "backup", "backups", "tasks", "task", "recurring", "repeatable", "freelancer", "spreadsheets", "processes"}
        return bool(words & workflow and words & context) or {"ai", "spreadsheets", "processes"} <= words
    return False


class ApprovalRequired(Exception):
    pass


class ApprovalUnavailable(Exception):
    pass


def confirm_local(profile, focus, cap):
    # JavaScript for Automation resolves Standard Additions at runtime. AppleScript's
    # dictionary-based "display dialog" syntax can fail to compile in a server process.
    script = """function run(argv) {
      const app = Application.currentApplication();
      app.includeStandardAdditions = true;
      const approve = "Approve " + argv[2] + " credits";
      const message = ["Fetch LinkedIn activity with Up2Data?", argv[0], "Focus: " + argv[1],
        "Total run limit today: " + argv[2] + " credits, including previous requests."].join("\\n");
      const result = app.displayDialog(message, {buttons: ["Cancel", approve],
        defaultButton: "Cancel", cancelButton: "Cancel", withTitle: "Inspiration map", givingUpAfter: 45});
      return result.gaveUp ? "cancelled" : result.buttonReturned;
    }"""
    if sys.platform != "darwin":
        raise ApprovalUnavailable
    try:
        result = subprocess.run(["/usr/bin/osascript", "-l", "JavaScript", "-e", script, "--", profile, focus, str(cap)],
                                capture_output=True, text=True, timeout=55)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ApprovalUnavailable from exc
    if result.returncode and "(-128)" not in result.stderr:
        raise ApprovalUnavailable
    return result.returncode == 0 and result.stdout.strip() == f"Approve {cap} credits"


def collect_focus(profile, focus, request_approval=False, *, owner_approved=False, max_credits=10):
    return collect_with_budget(profile, focus, request_approval, max_credits, owner_approved,
                               lambda fetch: sample_posts(profile, focus, fetch, max_credits))


def collect_audience(audience, profiles, max_credits):
    """Use only the audience to discover sources. The founder's offer stays in drafting."""
    def sample(fetch):
        if profiles:
            for profile in dict.fromkeys(profiles):
                fetch("profiles/activity", dict(url=profile, kind="posts", posted_within="all", per_page=25))
        else:
            fetch("search/posts", dict(keywords=[audience], posted_within="month",
                                       sort="relevance", per_page=25, max_results=25))

    return collect_with_budget("Audience research", audience, True, max_credits, False, sample,
                               audience_run=True)


def collect_with_budget(profile, focus, request_approval, max_credits, owner_approved, sample, *, audience_run=False):
    if type(max_credits) is not int or not 1 <= max_credits <= 100:
        raise ValueError("Credit limit must be an integer from 1 to 100")
    env = os.environ
    today = dt.datetime.now(ZoneInfo("Europe/Berlin")).date().isoformat()
    run_id = env.get("INSPIRATION_LIVE_RUN")
    configured = (not audience_run and run_id and re.fullmatch(r"[a-zA-Z0-9_-]+", run_id) and
                  env.get("INSPIRATION_LIVE_DATE") == today and
                  profile_key(env.get("INSPIRATION_LIVE_PROFILE", "")) == profile_key(profile) and
                  env.get("INSPIRATION_LIVE_FOCUS", "").strip().casefold() == focus.strip().casefold())
    settings = json.loads((ROOT / "config/audience-loop.json").read_text())
    if configured:
        config = effective_budget(settings, today, run_id)
        configured = min(config["run_credit_cap"], config["daily_credit_cap"]) > 0
    if not configured:
        digest = hashlib.sha256((profile_key(profile) + "|" + focus.strip().casefold()).encode()).hexdigest()[:20]
        run_id = f"inspiration-{today}-{digest}"
    grant = None

    def fetch(endpoint, body):
        nonlocal grant
        cached = read_cached(endpoint, body)
        if cached is not None:
            return cached
        if not request_approval and not owner_approved:
            raise ApprovalRequired
        path = BASE / "runs" / f"{run_id}.json"
        run = json.loads(path.read_text()) if path.exists() else {"allocated": 0}
        state = json.loads((BASE / "state.json").read_text())
        used_today = state["days"].get(today, {}).get("credits_reserved", 0)
        if configured:
            limits = dict(config, run_credit_cap=min(config["run_credit_cap"], max_credits))
        else:
            remaining = max(0, max_credits - run["allocated"])
            daily_ceiling = grant[2] if grant else used_today + remaining
            limits = dict(settings, run_credit_cap=max_credits, daily_credit_cap=daily_ceiling)
        if available(limits, state, run, today) < request_cost(endpoint, body):
            raise BudgetExhausted
        if not configured and grant is None:
            if not owner_approved and not confirm_local(profile, focus, max_credits):
                raise ApprovalRequired
            grant = (run_id, today, daily_ceiling, max_credits)
        return query(run_id, endpoint, body, grant, max_credits)

    try:
        sample(fetch)
    except BudgetExhausted:
        return "budget_reached"
    except ApprovalRequired:
        return "approval_required"
    except ApprovalUnavailable:
        return "approval_unavailable"
    return "completed"


def sample_posts(profile, focus, fetch, max_credits):
    def activity(url, kind):
        return fetch("profiles/activity", dict(url=url, kind=kind, posted_within="all", per_page=25))

    founder_posts = [post for post in activity(profile, "posts").get("posts", [])
                    if post.get("urn") and profile_key(post.get("author", {}).get("url", "")) == profile_key(profile)
                    and related(post.get("text", ""), focus)]
    participants = []
    for post in founder_posts[:max(2, max_credits // 5)]:
        data = fetch("posts/engagement/comments", dict(urn=post["urn"], sort="relevance", per_page=25, max_results=25))
        for comment in data.get("comments", []):
            actor = (comment.get("commenter") or {}).get("url", "")
            if re.fullmatch(r"https://(?:www\.)?linkedin\.com/in/[\w%-]+/?", actor) and profile_key(actor) != profile_key(profile) and actor not in participants:
                participants.append(actor)
    founder_urns = {str(post["urn"]) for post in founder_posts}
    seen = set()
    for actor in participants[:max(2, max_credits // 5)]:
        for comment in activity(actor, "comments").get("comments", []):
            target = comment.get("target_post") or {}
            urn = str(target.get("urn", ""))
            if urn.isdigit() and urn not in founder_urns and urn not in seen:
                fetch("posts/enrich", {"urn": urn})
                seen.add(urn)
                break


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("profile")
    parser.add_argument("focus")
    parser.add_argument("--max-credits", type=int, default=10)
    parser.add_argument("--ask", action="store_true")
    parser.add_argument("--owner-approved-10", action="store_true",
                        help="Use an explicit owner authorization of at most 10 credits")
    args = parser.parse_args()
    if args.owner_approved_10 and args.max_credits > 10:
        parser.error("--owner-approved-10 authorizes at most 10 credits")
    print(collect_focus(args.profile, args.focus, args.ask, owner_approved=args.owner_approved_10,
                        max_credits=args.max_credits))
