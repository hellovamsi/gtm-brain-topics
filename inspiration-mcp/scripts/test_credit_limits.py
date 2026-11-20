import json
import os
import tempfile
import subprocess
import unittest
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
import collect_focus as module
import audience_loop_collect as journal


class CreditLimits(unittest.TestCase):
    profile = "https://www.linkedin.com/in/example"
    focus = "workflow"
    def setUp(self):
        stack = ExitStack()
        self.addCleanup(stack.close)
        root = Path(stack.enter_context(tempfile.TemporaryDirectory()))
        self.base = root / "data/audience-loop"
        (self.base / "cache").mkdir(parents=True)
        (self.base / "runs").mkdir()
        (root / "config").mkdir()
        self.settings = root / "config/audience-loop.json"
        self.settings.write_text(json.dumps({"daily_credit_cap": 0, "run_credit_cap": 0,
                                            "prototype_total_credit_cap": 200}))
        (self.base / "state.json").write_text(json.dumps({"credits_reserved_total": 10, "days": {}, "pending": []}))
        for mod in (module, journal):
            stack.enter_context(patch.object(mod, "ROOT", root))
            stack.enter_context(patch.object(mod, "BASE", self.base))
        stack.enter_context(patch.dict(os.environ, {}, clear=True))
        self.native = stack.enter_context(patch.object(module, "confirm_local", return_value=True))
        self.request = stack.enter_context(patch.object(module, "query", return_value={"posts": []}))
        self.today = datetime.now(module.ZoneInfo("Europe/Berlin")).date().isoformat()
        digest = module.hashlib.sha256(b"example|workflow").hexdigest()[:20]
        self.run_id = f"inspiration-{self.today}-{digest}"

    def test_denied_approval_does_not_collect(self):
        self.native.return_value = False
        self.assertEqual(module.collect_focus(self.profile, self.focus, True), "approval_required")
        self.request.assert_not_called()

    def test_direct_audience_fetch(self):
        audience = "independent illustrators"
        profile = "https://www.linkedin.com/in/illustrator"
        self.assertEqual(module.collect_audience(audience, [profile, profile], 3), "completed")
        run_id, endpoint, body, grant, cap = self.request.call_args.args
        self.assertEqual((endpoint, body["url"], body["kind"], cap), ("profiles/activity", profile, "posts", 3))
        self.native.assert_called_once_with("Audience research", audience, 3)
        self.request.reset_mock()
        module.collect_audience(audience, [], 3)
        self.assertEqual(self.request.call_args.args[0], run_id)
        self.assertEqual(self.request.call_args.args[1:3], ("search/posts", {
            "keywords": [audience], "posted_within": "month", "sort": "relevance", "per_page": 25, "max_results": 25}))

    def test_bounds_and_native_cap(self):
        for invalid in [0, 101, 2.5, True]:
            with self.assertRaises(ValueError):
                module.collect_focus(self.profile, self.focus, True, max_credits=invalid)
        self.assertEqual(module.collect_focus(self.profile, self.focus, True, max_credits=32), "completed")
        self.native.assert_called_once_with(self.profile, self.focus, 32)
        self.assertEqual(self.request.call_args.args[-2:], ((self.run_id, self.today, 32, 32), 32))

    def test_insufficient_credit_returns_partial_before_prompt(self):
        for used, cap in [(0, 1), (10, 10), (10, 11)]:
            (self.base / "runs" / f"{self.run_id}.json").write_text(json.dumps({"allocated": used}))
            self.assertEqual(module.collect_focus(self.profile, self.focus, True, max_credits=cap), "budget_reached")
        self.native.assert_not_called()
        self.request.assert_not_called()

    def test_spent_run_reads_trailing_slash_cache_without_prompt(self):
        (self.base / "runs" / f"{self.run_id}.json").write_text(json.dumps({"allocated": 10}))
        now = datetime.now(timezone.utc)
        record = {"endpoint": "profiles/activity", "input": {"url": self.profile + "/", "kind": "posts",
                  "posted_within": "all", "per_page": 25}, "data": {"posts": []},
                  "fetched_at": now.isoformat(), "expires_at": (now + timedelta(days=1)).isoformat()}
        (self.base / "cache" / "sample.json").write_text(json.dumps(record))
        self.assertEqual(module.collect_focus(self.profile, self.focus, True), "completed")
        self.native.assert_not_called()
        self.request.assert_not_called()

    def test_configured_cap_and_cache_only(self):
        os.environ.update(INSPIRATION_LIVE_DATE=self.today, INSPIRATION_LIVE_PROFILE=self.profile,
                          INSPIRATION_LIVE_FOCUS=self.focus, INSPIRATION_LIVE_RUN="configured")
        self.settings.write_text(json.dumps({"daily_credit_cap": 6, "run_credit_cap": 5, "prototype_total_credit_cap": 200}))
        self.assertEqual(module.collect_focus(self.profile, self.focus), "approval_required")
        self.assertEqual(module.collect_focus(self.profile, self.focus, True, max_credits=1), "budget_reached")
        (self.base / "runs/configured.json").write_text(json.dumps({"allocated": 4}))
        self.assertEqual(module.collect_focus(self.profile, self.focus, True, max_credits=100), "budget_reached")
        self.request.assert_not_called()
        self.native.assert_not_called()

    def test_ledger_enforces_limit_under_its_lock(self):
        (self.base / "runs" / f"{self.run_id}.json").write_text(json.dumps({"allocated": 9, "requests": []}))
        with patch.object(journal, "load_key") as credentials:
            with self.assertRaises(journal.BudgetExhausted):
                journal.collect(self.run_id, "profiles/activity", {"url": self.profile, "kind": "posts"},
                                local_grant=(self.run_id, self.today, 100, 25), run_limit=10)
            credentials.assert_not_called()

    def test_prompt_errors_and_cancellation(self):
        self.native.side_effect = module.ApprovalUnavailable
        self.assertEqual(module.collect_focus(self.profile, self.focus, True), "approval_unavailable")
        self.native.side_effect = None
        self.native.return_value = False
        self.assertEqual(module.collect_focus(self.profile, self.focus, True), "approval_required")
        self.request.assert_not_called()


class NativePrompt(unittest.TestCase):
    def test_denial_errors_and_dynamic_approval(self):
        for result, expected in [
            (subprocess.CompletedProcess([], 0, "Approve 42 credits\n", ""), True),
            (subprocess.CompletedProcess([], 0, "cancelled\n", ""), False),
            (subprocess.CompletedProcess([], 1, "", "User canceled. (-128)"), False),
            (subprocess.CompletedProcess([], 1, "", "System access denied"), None),
        ]:
            with patch.object(module.sys, "platform", "darwin"), patch.object(module.subprocess, "run", return_value=result) as invoke:
                if expected is None:
                    with self.assertRaises(module.ApprovalUnavailable):
                        module.confirm_local("profile", "focus", 42)
                else:
                    self.assertIs(module.confirm_local("profile", "focus", 42), expected)
                self.assertEqual(invoke.call_args.args[0][-4:], ["--", "profile", "focus", "42"])


if __name__ == "__main__":
    unittest.main()
