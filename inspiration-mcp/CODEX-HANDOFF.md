# Run the audience inspiration map from a fresh Codex chat

Paste this into a new chat:

> Use the audience inspiration map in hellovamsi/gtm-brain-topics. Read inspiration-mcp/CODEX-HANDOFF.md, start the app, and verify it with the zero-credit smoke test. Give me the local preview URL. Ask who I want to reach and for my own LinkedIn profile, then ask what I’m building. Use existing evidence unless I explicitly authorize paid collection.

## Start the app

Install Node.js 24 or newer with npm and Git. From a directory where you keep projects:

```sh
git clone https://github.com/hellovamsi/gtm-brain-topics.git
cd gtm-brain-topics/inspiration-mcp
npm ci
npm run dev
```

If the fork is already checked out, start in its `inspiration-mcp` directory. Keep the server running. Open the local URL it prints, select **show-inspiration-map**, leave the input as `{}`, and click **Run**. In an MCP Apps host already connected to this server’s HTTP `/mcp` endpoint, call the same tool with `{}`.

In a second terminal in the app directory, run the following command using the actual server port. The test imports synthetic evidence, checks that the founder is excluded, checks the sourced topics and the removal of the drafting tool and reads the widget resource. It uses zero credits and requires no provider account.

```sh
node scripts/smoke.mjs http://localhost:3000/mcp
```

## Try the full UI with zero credits

1. Enter **independent exhibition designers** as the audience and your own LinkedIn profile URL. The URL identifies posts to exclude from audience evidence. The app discovers audience authors.
2. Enter **a tool for turning project handoffs into repeatable tasks** as your focus.
3. Expand **Existing evidence**. Paste the synthetic fixture below into **Evidence JSON**, then click **Build map from evidence**. The fixture uses example identities and illustrative post links. For actual research, supply dated English posts with real author and post URLs, or use an existing research cache.
4. Click a numbered point on the map and expand **Audience sources** to inspect the evidence. The horizontal axis counts source posts and the vertical axis counts authors. Click **Select topic** for each interest you want.
5. Click **Export topics**, review your selection, then choose **Download Markdown** or **Save to local workspace**. The server shows the saved filename.

```json
{
  "posts": [{
    "url": "https://www.linkedin.com/feed/update/urn:li:activity:101/",
    "author": "https://www.linkedin.com/in/example-reader/",
    "headline": "Independent exhibition designer",
    "postedAt": "2024-01-15T12:00:00Z",
    "language": "en",
    "text": "How can independent designers keep client feedback in one place during a project?"
  }]
}
```

## Use existing research

Set these optional environment variables in the server terminal **before** starting the app. Use absolute paths.

| Variable | What it points to |
| --- | --- |
| `INSPIRATION_CACHE_DIR` | Existing collector’s `data/audience-loop/cache` directory. Set this when using an external collector so the map reads its results. |
| `INSPIRATION_ICP_PATH` | Optional private audience definition and matching research candidates. |
| `INSPIRATION_DRAFTS_DIR` | Destination for selected topics saved by the server. |
| `INSPIRATION_COLLECTOR_DIR` | Root of the optional LinkedIn Agent checkout that owns the paid-request ledger. |

Select **Existing evidence → Build map from evidence** with the JSON field empty to use cached posts. A fresh clone contains no customer data. An empty map can mean missing or expired evidence, insufficient evidence of the author’s audience fit, or posts by the founder alone. Check the author URL, headline, language and date first. The number of topics depends on eligible posts and authors.

## Optional live Up2Data setup

Use the operator’s existing LinkedIn Agent checkout, settings, cache and ledger when available. For a first installation with access to the companion repository, run the following from the fork root. The patch adapts the pinned collector to enforce the app’s per-run limit under its ledger lock.

```sh
git clone https://github.com/philhae/linkedin-agent.git linkedin-agent
git -C linkedin-agent checkout adead8347aa95f263e1b8bc4a4fd89c1fb9fbf52
git -C linkedin-agent apply --check ../inspiration-mcp/scripts/linkedin-agent-budget.patch
git -C linkedin-agent apply ../inspiration-mcp/scripts/linkedin-agent-budget.patch
python3 linkedin-agent/scripts/init_local.py
python3 linkedin-agent/scripts/audience_loop.py
```

Those commands initialize a **fresh** installation. For an existing installation, point the app to it and verify that its collector supports `local_grant` and `run_limit`. Preserve its running totals and unresolved requests. At the default folder layout the app finds the companion and cache automatically.

Live collection requires Python 3, curl, a configured Up2Data credential and an interactive macOS session for the approval dialog. Follow the companion repository’s Up2Data access instructions to configure Keychain. Run the free check with `python3 linkedin-agent/scripts/up2data.py check` from the fork root. Keep the credential in the operator’s credential store.

Fresh settings have a cumulative credit ceiling of zero. Before paid use, agree an explicit budget with the operator and configure the approved cumulative ceiling in the companion’s private `config/audience-loop.json`. In the UI choose **Maximum credits**, click **Fetch with Up2Data**, and approve the native prompt. Prior reservations count. If a request ends with uncertain status, inspect the run receipt and ledger before any further fetch. More credits can buy more source material but cannot guarantee more distinct interests.

## Verify changes

From the app directory:

```sh
npx --no-install tsc --noEmit
npm run build
node --import tsx --test scripts/test*.ts
```

With the companion initialized and patched, also run `python3 -B -m unittest discover -s scripts -p 'test_*.py'`. The tests use mock requests. Rerun the HTTP smoke test against the server you started. For implementation details, follow `src/views/inspiration-map.tsx` for intake and selection, `src/audience.ts` for discovery, and `scripts/collect_focus.py` for the journaled collection adapter.
