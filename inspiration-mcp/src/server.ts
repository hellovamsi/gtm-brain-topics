import { z } from "zod";
import { saveMarkdown } from "./save.js";
import { Skybridge } from "skybridge/server";
import { researchFocus, researchInput } from "./research.js";
import { audienceInput, draftAudienceTopics, draftInput, researchAudience, audienceSeeds } from "./audience.js";
import { runAuthorizedAudienceCollection, runAuthorizedCollection } from "./live.js";
import { mapInput, type InspirationMap } from "./model.js";

function result(map: InspirationMap, message: string, isError = false) {
  return {
    structuredContent: map,
    content: [{ type: "text" as const, text: message }],
    isError,
  };
}

export const app = new Skybridge({
  name: "founder-inspiration-map",
  version: "0.0.1",
  handler: (server) => server.registerTool(
    {
      name: "show-inspiration-map",
      description: [
        "Open the inspiration map with {} to ask who the user wants to reach.",
        "Call research-audience to map the audience’s own English LinkedIn posts. Ask the user to select topics, then call draft-audience-topics to connect only those topics to the user's focus.",
        "This view can also display a previously supplied founder map. Never invent sources or publish posts.",
      ].join(" "),
      inputSchema: mapInput,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      view: { component: "inspiration-map", description: "Explore grounded post ideas by topic distance and angle." },
    },
    async ({ profile, baseline, ideas }) => {
      const empty: InspirationMap = { profile: "", baseline: "", ideas: [] };
      if (profile === undefined && baseline === undefined && ideas === undefined) {
        return result(empty, "Describe the audience you want to reach.");
      }
      if (profile === undefined || baseline === undefined || ideas === undefined) {
        return result(empty, "Supply profile, baseline and ideas together, or use {} to open profile intake.", true);
      }
      return result({ profile, baseline, ideas }, ideas.length ? `Mapped ${ideas.length} post ideas.` : baseline);
    },
  ).registerTool(
    {
      name: "research-audience",
      description: "Discover what an audience discusses in its own dated English posts. Discover authors from the audience definition. The profile field identifies the founder, whose posts are excluded. Focus is reserved for drafting. Return observed topics with source excerpts and sample counts so the user can choose what to explore.",
      inputSchema: audienceInput,
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (input) => {
      const profiles = await audienceSeeds(input);
      const collection = input.evidence ? "imported" : input.requestApproval
        ? await runAuthorizedAudienceCollection(input.audience, profiles, input.maxCredits) : "cached";
      const map = await researchAudience(input);
      return { structuredContent: { ...map, collection }, content: [{ type: "text" as const, text: map.baseline }] };
    },
  ).registerTool(
    {
      name: "draft-audience-topics",
      description: "Draft post suggestions from the user's selected audience topics and editorial focus. Pass only topics the user picked from research-audience. Each draft preserves its audience source.",
      inputSchema: draftInput,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ audience,focus,topics }) => {
      const drafts = draftAudienceTopics(audience,focus,topics);
      return { structuredContent:drafts, content:[{ type:"text" as const, text:`Drafted ${drafts.suggestions.length} selected topics.` }] };
    },
  ).registerTool(
    {
      name: "research-focus",
      description: "Trace a research focus from the founder’s English LinkedIn posts to identifiable engagers, then to other authors’ posts those same people engaged with. Use authorized dated, linked evidence. Reads the available research cache by default. Live collection requires an explicit request and a native approval or matching configured budget. Set maxCredits to the total run limit, including previous requests. Return only ideas backed by both interactions.",
      inputSchema: researchInput,
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async ({ profile, focus, evidence, requestApproval, maxCredits }) => {
      const collection = evidence ? "imported" : await runAuthorizedCollection(profile, focus, requestApproval, maxCredits);
      const map = await researchFocus({ profile, focus, evidence });
      return result({ ...map, collection }, map.baseline);
    },
  ).registerTool(
    {
      name: "save-markdown",
      description: "Save the founder's explicitly accepted Markdown to the local workspace after they click Save.",
      inputSchema: { markdown: z.string().min(1).max(200000) },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async ({ markdown }) => {
      const filename = await saveMarkdown(markdown);
      return { structuredContent: { filename }, content: [{ type: "text" as const, text: filename }] };
    },
  ),
});

export type AppType = typeof app;
