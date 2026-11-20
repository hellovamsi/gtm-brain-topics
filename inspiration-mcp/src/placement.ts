const stop = new Set("a about an and are as at be by can do for from how i in into is it my of on or our that the their them these this to we what when which with you your".split(" "));
export function terms(text: string) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter(word => !stop.has(word)).map(word => word.length > 4 ? word.replace(/s$/, "") : word));
}
// In "task factory for solopreneurs", the suffix describes the audience.
// Founder posts only need to discuss the core topic to seed the map.
export function discoveryTerms(focus: string) {
  const subject = focus.trim().match(/^(task\s+factor(?:y|ies))\s+for\s+.+$/i);
  return subject ? terms("task factory") : terms(focus);
}
export function matchesFocus(words: Set<string>, focus: Set<string>) {
  if (!focus.size) return false;
  if ([...focus].every(term => words.has(term))) return true;
  if (focus.size === 2 && focus.has("task") && focus.has("factory")) {
    const automation = ["workflow", "automation", "automate", "automating"];
    const recurring = ["routine", "backup", "task", "recurring", "repeatable", "freelancer", "spreadsheet", "processe", "process"];
    return (automation.some(term => words.has(term)) && recurring.some(term => words.has(term)))
      || (words.has("ai") && words.has("spreadsheet") && words.has("processe"));
  }
  return false;
}

// Place the observed interest relative to the stated focus. Use the same
// excerpt the reader sees in the detail card to classify the angle.
export const noveltyLabels = ["Familiar topic", "Related topic", "Adjacent topic"] as const;
export const variationLabels = ["Variation", "Different lens", "Fresh take"] as const;

export function placeInterest(title: string, excerpt: string, focus: string) {
  const subject = discoveryTerms(focus.replace(/^(?:I(?:’m|'m| am) )?(?:building|creating|developing)\s+/i, "").split(/\s+for\s+/i)[0]);
  const evidence = title + " " + excerpt;
  const words = terms(evidence);
  // A workflow builder and an audience author may describe the same work
  // with different words (for example, delegating reminders to an AI agent).
  const workflowFocus = /\b(task factor(?:y|ies)|automation|automating|workflows?)\b/i.test(focus);
  const directWorkflow = workflowFocus && /\b(automat(?:e|ed|ing|ion)|workflows?|ai agents?)\b/i.test(evidence);
  const relatedWorkflow = workflowFocus && /\b(reminders?|handoffs?|checklists?|invoic(?:e|es|ing)|deep work|recurring tasks?)\b/i.test(evidence);
  const related = [...subject].some(word => words.has(word));
  const novelty = (matchesFocus(words, subject) || directWorkflow) ? noveltyLabels[0] : (related || relatedWorkflow) ? noveltyLabels[1] : noveltyLabels[2];
  const challenge = /\b(?:instead|mistake|except|however|although|failed|failure|disagree|drawback|myth|but|rethink|contrary|even though|the more .{1,60} the more)\b/i.test(excerpt);
  const lens = /\b(?:compare|comparison|perspective|from the|through|versus|unlike|as a|as an|learned|reminds me|my own|i reali[sz]e|what if|without .{1,65} i would)\b/i.test(excerpt);
  const variation = challenge ? variationLabels[2] : (lens || excerpt.trim().endsWith("?")) ? variationLabels[1] : variationLabels[0];
  return { novelty, variation };
}
