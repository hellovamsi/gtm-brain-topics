# Topic and audience decisions

Decision record for the first collaborative version, 20 November 2026. The implementation
and operating instructions are in [Topic and audience workflows](TOPIC-AND-AUDIENCE.md).

## Decisions from Philipp

| Decision | Basis | Effect |
| --- | --- | --- |
| Continue development in `philhae/gtm-brain-topics` | "Going forward, we will work on this fork of the GTM brain." | Keep this work in the fork; upstream GTM Brain remains the base, not the destination for this change. |
| Follow the integration design | "follow the integration plan" | Implement the prepared architecture rather than waiting for an unidentified original analyzer. |
| Keep two separate skills and workflows | "make it two separate skills / workflows" | Topic analysis and audience discovery have independent entry points, results and resumable runs. |
| Publish an initial collaborative version | "Push this into the forked repo as a first version of the skills so we can collaborate on them." | Commit the first version on `codex/topic-analyzer-audience-loop` and push it to the fork. Initial implementation: `0091c8b`. |
| Document decisions and merge when possible | "Capture the decisions made so far to be documented on this branch as well. Merge if you can." | Keep this record on the branch and attempt a normal merge into the fork's `main`, respecting repository checks and protections. |

These choices authorize source development and publication to the fork. They do not install
the plugin, activate a company workflow, create a schedule or authorize paid collection or
external engagement.

## Architecture adopted for the first version

These are implementation choices made under the agreed integration design, rather than
additional verbatim instructions from Philipp.

| Choice | Reason and consequence |
| --- | --- |
| `gtmb-topic-analyzer` answers which questions and problems deserve attention | Produces a sourced shortlist with relevance, recurrence, urgency, confidence and proposed angles kept distinct. It can use interviews, CRM notes or supplied evidence independently of audience discovery. |
| `gtmb-audience-loop` finds relevant people and conversations | Assesses ICP and conversation-host roles independently, with separate evidence and admission status. Popularity and topic fit do not establish buyer qualification. |
| Handoffs are optional and carry evidence references | Either skill works alone. A handoff transfers profile, scope, source dates and unresolved questions, without transferring qualification or approval or silently starting the other workflow. |
| Reuse GTM Brain storage and workflow operations | Findings use sourced memories and reports; existing entity IDs preserve identity. Only the workflow tool writes run progress. No new topic ontology object, identity database, collector or MCP operation is introduced. |
| Ship manual draft workflow templates | Topic analysis and Audience discovery support staged runs. Setup supplies them to new brains; existing workflow folders remain untouched by upgrade. Adoption uses the existing workflow creation procedure. |
| Keep company configuration outside the plugin | Provider credentials, datasets, budgets, dated allowances, tracking lists and Slack destinations stay with the company. Reuse a resumable collector and reconcile uncertain requests before retrying. |
| Preserve review and action boundaries | Proposed topics, candidate nominations, admitted members, draft writing and publication are distinct outcomes. External delivery and LinkedIn actions retain their own authority. |
| Register both skills and bump the plugin to 0.38.1 | Catalog, shipped-name registry, host metadata and documentation make the first version discoverable and versioned. The installed plugin remains unchanged. |

## Evidence and validation limits

The audience-loop method is adapted from the LinkedIn Agent project. The topic analyzer is
a new implementation of the accepted design; an original skill with that name was not found.
This version does not claim to reproduce an unseen source or to include the existing live
collection system.

All 69 affected tests passed, as did the two skill validators and generated-file consistency
check. The broader test run found a pre-existing date-sensitive assertion and was stopped
during its historical upgrade matrix. Full-suite validation remains incomplete. The two
change-related failures found during that run were corrected and pass in the affected suites.

Live connector behavior, semantic research quality, installation and operational adoption
remain unverified. These limits are part of the first-version status, not a claim of
production readiness. Merge status is recorded by the pull request and git history.

## Next development questions

- Calibrate topic ranking and audience qualification against representative company evidence.
- Decide whether a provider adapter or collector belongs in this fork after a concrete need is established.
- Complete broad compatibility and live validation before treating this version as an operational release.
- Decide separately when to install it and adopt either workflow in a company brain.
