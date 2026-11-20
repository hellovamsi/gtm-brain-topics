# Deliver the audience inspiration map

First ask who the target audience is and collect the user's own LinkedIn profile. Then ask what the person is building or doing.
Reuse either answer when already supplied. Look for English posts or comments by people
whose work and activity fit the stated audience. Keep the source link, author, date and
evidence of membership with each observed interest. Discover audience profiles from the description and author evidence. Exclude the founder's posts. If evidence is missing, report the gap.

Show sourced audience interests as individually selectable topics. Explain what each source
supports, including whether the topic appeared only once. Keep the observed interest
separate from a proposed connection to the person's work.

After the person picks topics, generate suggestions combining each selected audience interest
with what they are building or doing. Preserve original sources and distinguish the draft's
inferences from the audience member's words. Let the person review and accept drafts.

## Standalone HTML delivery

Use the standalone renderer's topic and angle coordinates when comparing the ideas with a
supplied baseline. Its supported labels are Familiar topic, Related topic and Adjacent topic
for topic distance, and Variation, Different lens and Fresh take for angle. Vary the two
coordinates independently and leave unsupported cells empty.

Prepare a JSON object with baseline (short description of comparison material) and ideas
(array). Each idea has string fields id (stable within the report), title, reason, source
(person, original date and source URL or internal reference), topic and angle (the exact
labels above). Use the bundled Node renderer in this skill:
`node <topic-analyzer-skill-dir>/scripts/render-map.mjs <input.json> <output.html>`.
Write to the project's report destination using a fresh filename, and return a clickable
link to the HTML. Check the mapped items have the intended sources and coordinates.

The founder checks individual ideas, inspects source details, and copies their picks back
to chat. Use those IDs for follow-up. Unselected ideas have no recorded decision.
