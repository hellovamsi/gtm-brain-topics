import { z } from "zod";

export const topics = ["Familiar topic", "Related topic", "Adjacent topic"] as const;
export const angles = ["Variation", "Different lens", "Fresh take"] as const;

const nonEmpty = z.string().trim().min(1);
const httpsUrl = z.url({ protocol: /^https$/ }).refine((value) => {
  const url = URL.parse(value);
  if (!url) return false;
  return !url.username && !url.password;
}, "Use a public HTTPS URL without embedded credentials.");

export const profileUrl = httpsUrl.refine((value) => {
  const url = URL.parse(value);
  if (!url) return false;
  return !url.port && /(^|\.)linkedin\.com$/.test(url.hostname) && /^\/in\/[^/]+\/?$/.test(url.pathname);
}, "Use the founder's LinkedIn /in/ profile URL.");

const ideaSchema = z.object({
  id: nonEmpty.describe("Stable, unique identifier for this idea."),
  title: nonEmpty,
  topic: z.enum(topics).describe("Topic distance from the founder's observed posts."),
  angle: z.enum(angles).describe("How far the approach moves from the founder's existing angle."),
  trail: z.object({
    actor: profileUrl, founderInteraction: httpsUrl, audienceInteraction: httpsUrl,
    founderInteractionAt: z.string(), audienceInteractionAt: z.string(),
    founderPostedAt: z.string(), audiencePostedAt: z.string(),
  }).optional(),
  founderSource: httpsUrl.describe("Direct link to the founder post that inspired the idea."),
  audienceSource: httpsUrl.describe("Direct link to the evidence of the audience's concern."),
  reason: nonEmpty.describe("Explain what the sources show and why this variation fits."),
  offerConnection: nonEmpty,
});

export type Idea = z.infer<typeof ideaSchema>;
export type InspirationMap = { collection?: "approval_required" | "approval_unavailable" | "budget_reached" | "completed" | "imported"; profile: string; baseline: string; ideas: Idea[] };

export const mapInput = {
  profile: profileUrl.optional(),
  baseline: nonEmpty.describe("Summarize observed founder topics and angles, or explain missing evidence.").optional(),
  ideas: z.array(ideaSchema).refine(
    (ideas) => new Set(ideas.map((idea) => idea.id)).size === ideas.length,
    "Each idea must have a unique ID.",
  ).optional(),
};
