# Topic and audience workflows

This fork ships two independent research skills and two manual draft workflows.

| Skill | Question it answers | Result |
| --- | --- | --- |
| `/gtmb-topic-analyzer` | Which recurring questions and problems deserve our attention? | Sourced topic shortlist, confidence, proposed angles and reviewed priorities |
| `/gtmb-audience-loop` | Which people and live conversations are relevant to our offering? | Independently assessed ICPs and hosts, timely opportunities and review decisions |

Run either skill directly for one sitting, or start its Topic analysis or Audience discovery
workflow for staged execution. A workflow records progress through the existing workflow tool;
the skill performs only its current stage. All shipped workflows remain manual drafts.

Topic analysis can read customer interviews, CRM notes or supplied material without audience
discovery. Audience discovery can start from strategy and ICP without a topic shortlist.
An optional handoff passes source/report references, profile, scope and unanswered questions.
It never transfers qualification, approvals or automatically starts the other workflow.

## Existing brains

Setup copies the four workflow templates into a new brain. Upgrade adds them only when the
workflows folder is absent; it never overwrites or replenishes an existing folder. For an
existing brain, ask to create Topic analysis or Audience discovery from the corresponding
shipped template through the normal `gtmb-workflow` creation procedure. Review and save it
there. Installing this fork alone does not activate it or schedule execution.

## Collection and company configuration

Provider access, budgets, geography, freshness, quality targets, tracking lists and delivery
channels belong to the company, not the plugin. Reuse an existing resumable collector and its
request ledger. These skills do not implement a new collector or provide paid research
permission. Without authorized access, analyze supplied evidence and report the source gap.
LinkedIn actions and external delivery retain separate authorization.

The audience method adapts the LinkedIn Agent audience-loop structure into a provider-neutral
skill. Topic analysis implements the agreed integration design; it is not a claimed verbatim
migration of a previously located topic-analyzer skill. No credentials, personal datasets,
Slack channel IDs, standing budgets or dated allowances are shipped.

## Development validation

The skill catalog and workflow tests cover discovery, manual defaults and real parser behavior.
Validate new skills with the skill-creator validator and run the repository suite before shipping.
Live connector behavior, research judgement and installation require separate end-to-end checks.

## Preparation validation on 20 November 2026

Both skill-creator validators and the generated-file consistency check pass. All 69 tests in
the six affected suites pass, including separate workflow continuation, catalog discovery,
name registration, document listing and template defaults. Tests run from a temporary checkout
without spaces because parts of the existing harness use URL pathnames as filesystem paths.

The broader suite has an unrelated date-sensitive failure in `dots.test.mjs`: its expectation
accepts only 10-19 November while the recorded date is 20 November. The broad run was stopped during its 96-version historical upgrade
matrix; full-suite validation is incomplete. Its two change-related failures were corrected
and pass in the final affected-suite rerun. No live provider collection, installation or
semantic end-to-end run has been performed for this preparation.
