---
name: gtmb-topic-analyzer
description: |
  Analyze recurring audience questions and problems into an evidence-backed topic shortlist.
  Triggers: "/gtmb-topic-analyzer", "analyze our topics", "which topics matter to our buyers".
  Produces a sourced topic report. Not people or conversation discovery (gtmb-audience-loop),
  market sizing (gtmb-market-research), or finished post writing.
allowed-tools: [Bash, Read]
---

# GTM Brain: Topic analyzer

Use [the method](references/method.md) to choose topics from evidence. This skill can run
without the audience loop, using customer interviews, CRM notes or supplied source material.

## Start a founder inspiration run

First ask who the target audience is. Then ask what the person is building or doing. Reuse
answers already supplied. With the connected `show-inspiration-map` tool, open the app with
`{}` and let the person complete those steps there. Map interests found directly in English
posts or comments by audience members, with source links and evidence of audience fit.
After the person selects topics, generate suggestions that combine the selected interests
with their work. Let them review, accept and save drafts.

For standalone HTML delivery, follow [the audience map instructions](references/inspiration-map.md).

## Frame the analysis

Reuse the resolved brain, person and project. Follow [context routing](../gtmb-use-brain/references/context-routing.md)
and load an existing fitting context. Read strategy first, then ICP and the selected offering
through `document`. Read relevant memories and the last topic report before asking for gaps.
State which guidance applies. Keep offering/profile assessments separate.

Resolve objective, intended audience, source set, time window and research authority from
existing instructions or one focused question using [question handling](../gtmb-start/references/questions.md).
A missing source is a gap, not permission for paid collection. Read
[collection and evidence](references/evidence.md) before live research.

## Analyze and review

Before producing contribution recommendations, apply the shared
[contribution eligibility contract](references/contribution-filtering.md). Resolve company parameters,
bind assessments to evidence and profile revisions, and feed every recommendation and export
from the same eligible set. Keep broad research inventory separate from eligible opportunities.

Cluster by the audience's underlying problem or question, preserving source wording.
Compare relevance, recurrence, urgency and confidence independently. Place each sourced audience
interest on the interactive map, with its supporting authors and posts. Generate post suggestions
after the person chooses interests. For standalone delivery, follow [the map instructions](references/inspiration-map.md)
and return the HTML link. Retain only confirmed picks as reviewed priorities.

## Retain and hand off

Follow [documents](../gtmb-use-brain/references/documents.md) for a report document with status
draft, or a project draft in its established destination. Keep accepted findings and decisions
with `remember`, source references and profile scope in the existing context. Preserve rejected
ideas and reasons when they prevent repeated recommendations. Never directly edit memory files.

For a staged execution, use the separate manual Topic analysis workflow through `workflow`.
Only that tool writes run state. Resume its current step and execute only that stage of this
skill; do not rerun completed collection or restart the full analysis at every step.

An optional handoff to [Audience loop](../gtmb-audience-loop/SKILL.md) contains accepted topic
IDs/report reference, audience/profile, discovery queries and unresolved evidence questions.
The receiving workflow qualifies people independently; topic fit does not establish ICP fit.
The audience loop can return source pointers for a later topic analysis without starting one.

Finish with the linked HTML map, accepted priorities and unresolved gaps. Do not publish, send outreach,
admit people to tracking lists, schedule runs or send Slack reports through this skill.
