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

Cluster by the audience's underlying problem or question, preserving source wording.
Compare relevance, recurrence, urgency and confidence independently. Produce a compact table:
topic, audience/problem, independent evidence and dates, contradictory evidence, relevance,
confidence, proposed angle and next validation. Include weak or rejected themes when they
change the priority decision. A shortage of evidence is an acceptable result.

Show the shortlist and ask what to accept or correct before retaining priorities as decisions.
An accepted topic is a priority for exploration, not proof of demand or approval to publish.

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

Finish with the report, accepted priorities and unresolved gaps. Do not publish, send outreach,
admit people to tracking lists, schedule runs or send Slack reports through this skill.
