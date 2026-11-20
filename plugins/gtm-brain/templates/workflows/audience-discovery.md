---
kind: document
type: workflow
title: Audience discovery
applies_to: [people and conversation discovery]
status: draft
trigger: manual
reads: ["kind:person", "kind:organization"]
writes: []
by: ""
updated: {{DATE}}
gtm-brain: {{VERSION}}
---
# Audience discovery

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

1. **Frame discovery** (skill: gtmb-audience-loop). For founder inspiration, ask who the target audience is, then what the person is building or doing. Reuse answers already supplied. Confirm selected profile, roles, geography, freshness, result target and research authority. Record a run-scoped completion note through the workflow tool with tag audience-frame only after the work is verified. Milestone: a note tagged audience-frame.
2. **Discover candidates** (skill: gtmb-audience-loop). Reconcile pending requests, reuse evidence and expand discovery within authorized limits. Record a run-scoped completion note through the workflow tool with tag audience-evidence only after the work is verified. Milestone: a note tagged audience-evidence.
3. **Assess opportunities** (skill: gtmb-audience-loop). For founder inspiration, map contributors’ observed interests and export the person’s picks with their sources. For buyer or host discovery, qualify ICP and host roles independently. Apply the shared contribution contract across all discovery routes; prepare sourced opportunities, aggregates and recommendation exports from the same eligible set, with excluded and needs-screening counts. Keep nominations separate. Record a run-scoped completion note through the workflow tool with tag audience-reviewed only after the work is verified. Milestone: a note tagged audience-reviewed.
4. **Capture feedback** (skill: gtmb-audience-loop). Ask the person for per-role decisions and opportunity feedback; record the actual response and any authorized list updates. Record a run-scoped completion note through the workflow tool with tag audience-feedback only after the work is verified. Milestone: a note tagged audience-feedback.

## Learn

- Which opportunities and candidates were useful for this profile?
- Which source gaps or feedback should change the next discovery run?
