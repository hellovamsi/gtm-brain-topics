---
kind: document
type: workflow
title: Topic analysis
applies_to: [audience topic prioritization]
status: draft
trigger: manual
reads: ["kind:person", "kind:organization"]
writes: []
by: ""
updated: {{DATE}}
gtm-brain: {{VERSION}}
---
# Topic analysis

A manual staged run. Execute only the current stage of the named skill. Record progress through
the workflow tool; collection, external delivery and list updates retain their own authority.
This workflow does not start the other workflow or create a schedule.

## Before starting

- **Audience and offering**: selected profile and relevant buyer definition.
- **Scope and sources**: objective, source set, time window and quality target.
- **Research authority**: permitted access, request/run/daily/cumulative caps or existing evidence only.
- **Contribution policy**: company configuration reference/revision for profile, formats, fit, contribution topics, angle and freshness; inventory-only scope when no contribution recommendations are requested.
- **Review and output**: reviewer, report destination and existing context for findings.

## Steps

1. **Frame the analysis** (skill: gtmb-topic-analyzer). For founder inspiration, ask who the target audience is, then what the person is building or doing. Reuse answers already supplied. Confirm audience, offering, objective, source window and collection authority. Record a run-scoped completion note through the workflow tool with tag topic-frame only after the work is verified. Milestone: a note tagged topic-frame.
2. **Review the evidence** (skill: gtmb-topic-analyzer). Reuse dated sources and collect only authorized gaps; preserve coverage. Record a run-scoped completion note through the workflow tool with tag topic-evidence only after the work is verified. Milestone: a note tagged topic-evidence.
3. **Analyze the themes** (skill: gtmb-topic-analyzer). Map observed audience interests and their source evidence. Compare recurrence, buyer relevance, urgency, confidence and contradictions. Keep broad inventory separate; apply the shared contribution contract to proposed contribution opportunities and downstream handoffs. Record a run-scoped completion note through the workflow tool with tag topic-shortlist only after the work is verified. Milestone: a note tagged topic-shortlist.
4. **Review priorities** (skill: gtmb-topic-analyzer). For post inspiration, generate suggestions from the selected interests and the person’s focus. Ask the person to accept or correct the shortlist; record their actual response, then retain accepted outcomes. Record a run-scoped completion note through the workflow tool with tag topic-reviewed only after the work is verified. Milestone: a note tagged topic-reviewed.

## Learn

- Which topics were accepted or rejected, and why?
- Which evidence gaps could change the next analysis?
