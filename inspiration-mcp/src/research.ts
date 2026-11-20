import { discoveryTerms, matchesFocus, terms } from "./placement.js";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { franc } from "franc-min";
import { z } from "zod";
import { profileUrl, type Idea, type InspirationMap } from "./model.js";

export function linkedinPostKey(value: string) {
  const url = URL.parse(value);
  if (!url || url.protocol !== "https:" || url.port || url.username || url.password ||
      !/^(?:[a-z]+\.)?linkedin\.com$/i.test(url.hostname)) return undefined;
  const path = url.pathname.replace(/\/$/, "");
  const urn = /^\/feed\/update\/urn:li:(?:activity|share|ugcPost):(\d+)$/i.exec(path);
  if (urn) return urn[1];
  if (!/^\/posts\/[^/]+$/.test(path)) return undefined;
  return /(?:^|[-_])activity-(\d+)(?:-|$)/.exec(path)?.[1] ?? path;
}

export const linkedPost = z.url().refine(value => Boolean(linkedinPostKey(value)), "Use a LinkedIn post or interaction permalink.");
const timestamp = z.iso.datetime({ offset: true });
export const postSchema = z.object({
  headline: z.string().max(600).optional(),
  url: linkedPost, author: profileUrl, postedAt: timestamp, text: z.string().trim().min(1), language: z.literal("en"),
});
const interactionSchema = z.object({
  actor: profileUrl, postUrl: linkedPost, url: linkedPost, occurredAt: timestamp,
  kind: z.enum(["comment", "reaction", "repost"]), language: z.literal("en"),
}).refine(value => linkedinPostKey(value.postUrl) === linkedinPostKey(value.url), "Interaction link must identify the target post.");

export const evidenceSchema = z.object({
  posts: z.array(postSchema).max(500), interactions: z.array(interactionSchema).max(2000),
});
export const researchInput = {
  maxCredits: z.number().int().min(1).max(100).optional().describe("Default 10. Total credits allowed for this founder, focus and day, including previous requests."),
  requestApproval: z.boolean().optional().describe("Request a native Mac budget prompt only after the user selects live research."),
  profile: profileUrl, focus: z.string().trim().min(1).max(400),
  evidence: evidenceSchema.optional().describe("Optional authorized English LinkedIn records with source links, dates and named actors."),
};
export type Evidence = z.infer<typeof evidenceSchema>;
type Post = Evidence["posts"][number];
type Interaction = Evidence["interactions"][number];

function record(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
}
function list(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}
export function identity(url: string) {
  return new URL(url).pathname.replace(/\/$/, "").toLowerCase();
}
function english(text: unknown) {
  return typeof text === "string" && franc(text.replace(/https?:\/\/\S+/g, ""), { minLength: 25 }) === "eng";
}
function providerPost(raw: unknown) {
  const post = record(raw);
  if (!english(post.text)) return;
  return postSchema.safeParse({
    headline: typeof record(post.author).headline === "string" ? String(record(post.author).headline).slice(0,600) : undefined,
    url: post.url, author: record(post.author).url, postedAt: post.posted_at, text: post.text, language: "en",
  }).data;
}
function providerComment(raw: unknown, targetUrl: string, all: Interaction[], knownActor?: string, targetText?: string) {
  const row = record(raw);
  const targetKey = linkedinPostKey(targetUrl);
  const permalink = typeof row.url === "string" && linkedinPostKey(row.url) === targetKey ? row.url : targetUrl;
  const actor = record(row.commenter).url;
  const profile = profileUrl.safeParse(actor);
  // A one-word reply copied from the verified English post (often a CTA keyword)
  // establishes an interaction. Its text is never used to infer agreement.
  const keyword = typeof row.text === "string" ? row.text.trim().toLowerCase() : "";
  const echoedKeyword = /^[a-z]{3,25}$/.test(keyword) && terms(targetText ?? "").has(keyword);
  if (profile.success && (!knownActor || identity(profile.data) === identity(knownActor)) && (english(row.text) || echoedKeyword)) {
    const item = interactionSchema.safeParse({
      actor: profile.data, url: permalink, postUrl: targetUrl, occurredAt: row.posted_at, kind: "comment", language: "en",
    });
    if (item.success) all.push(item.data);
  }
  for (const reply of list(row.replies)) providerComment(reply, targetUrl, all, knownActor);
}

// Cache paths are deployment configuration, never tool inputs. Skip unreadable and expired entries.
export async function readCacheEvidence(cacheDir = process.env.INSPIRATION_CACHE_DIR ??
  resolve("../linkedin-agent/data/audience-loop/cache"), now = Date.now()): Promise<Evidence> {
  const posts: Post[] = [], interactions: Interaction[] = [];
  const postByUrn = new Map<string, string>();
  const entries = await readdir(cacheDir, { withFileTypes: true }).catch(() => []);
  const docs: Record<string, unknown>[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^[\da-f]{32}\.json$/i.test(entry.name)) continue;
    try {
      const doc = record(JSON.parse(await readFile(resolve(cacheDir, entry.name), "utf8")));
      if (Date.parse(String(doc.fetched_at)) <= now && Date.parse(String(doc.expires_at)) > now) docs.push(doc);
    } catch { /* An incomplete or malformed cache entry is not evidence. */ }
  }
  for (const doc of docs) {
    const data = record(doc.data);
    let rows = list(data.posts);
    if (doc.endpoint === "posts/enrich") rows = [data.post ?? data];
    else if (doc.endpoint !== "search/posts" && !(doc.endpoint === "profiles/activity" && record(doc.input).kind === "posts")) continue;
    for (const row of rows) {
      const post = providerPost(row);
      if (!post) continue;
      posts.push(post);
      for (const id of [record(row).urn, record(row).share_urn, linkedinPostKey(post.url)]) {
        if (typeof id === "string" && id.length) postByUrn.set(id, post.url);
      }
    }
  }
  const verifiedText = new Map(posts.map(post => [linkedinPostKey(post.url), post.text]));
  for (const doc of docs) {
    const data = record(doc.data), request = record(doc.input);
    if (doc.endpoint === "posts/engagement/comments") {
      const url = postByUrn.get(String(request.urn ?? data.urn)) ?? linkedPost.safeParse(request.url).data;
      if (url) for (const row of list(data.comments)) providerComment(row, url, interactions);
    } else if (doc.endpoint === "profiles/activity" && request.kind === "comments") {
      const profile = profileUrl.safeParse(data.url);
      const requested = profileUrl.safeParse(request.url);
      if (!profile.success || !requested.success || identity(profile.data) !== identity(requested.data)) continue;
      for (const row of list(data.comments)) {
        const target = record(record(row).target_post);
        const url = linkedPost.safeParse(target.url).data ?? postByUrn.get(String(target.urn));
        if (url) providerComment(row, url, interactions, profile.data, verifiedText.get(linkedinPostKey(url)));
      }
    }
  }
  return { posts, interactions };
}

function treatment(seed: Post, other: Post, focus: string) {
  const keyword = excerpt(focus, 65);
  const focusWords = discoveryTerms(focus), seedWords = terms(seed.text), otherWords = terms(other.text);
  const shared = [...otherWords].filter(word => word.length > 3 && seedWords.has(word));
  const topic: Idea["topic"] = matchesFocus(otherWords, focusWords) ? "Familiar topic" :
    shared.length >= 2 || [...focusWords].some(word => otherWords.has(word)) ? "Related topic" : "Adjacent topic";
  const challenge = /\b(?:instead|mistake|except|however|although|failed|failure|disagree|drawback|myth|but)\b/i.test(other.text);
  const procedure = /\b(?:step|steps|routine|checklist|first|repeat|each week|every week|each time)\b/i.test(other.text);
  const angle: Idea["angle"] = challenge ? "Fresh take" : procedure || topic === "Familiar topic" ? "Variation" : "Different lens";
  if (angle === "Fresh take") return { topic, angle,
    title: `Where does ${keyword} break down?`,
  };
  if (angle === "Variation") return { topic, angle,
    title: `A small experiment in ${keyword}`,
  };
  return { topic, angle, title: `${keyword} through a different lens`,
  };
}

function excerpt(text: string, limit: number) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= limit) return oneLine;
  return oneLine.slice(0, limit).replace(/\s+\S*$/, "").trimEnd() + "…";
}

export async function researchFocus(
  input: { profile: string; focus: string; evidence?: Evidence },
  options: { cacheDir?: string; now?: number } = {},
): Promise<InspirationMap> {
  const now = options.now ?? Date.now();
  const cached = await readCacheEvidence(options.cacheDir, now);
  const posts = new Map<string, Post>();
  for (const post of [...cached.posts, ...input.evidence?.posts ?? []]) {
    if (Date.parse(post.postedAt) <= now) posts.set(linkedinPostKey(post.url)!, post);
  }
  const byPost = new Map<string, Interaction[]>(), byActor = new Map<string, Interaction[]>();
  for (const edge of [...cached.interactions, ...input.evidence?.interactions ?? []]) {
    const key = linkedinPostKey(edge.postUrl)!;
    const post = posts.get(key);
    const time = Date.parse(edge.occurredAt);
    if (!post || time > now || time < Date.parse(post.postedAt)) continue;
    const actor = identity(edge.actor);
    if (!byPost.has(key)) byPost.set(key, []);
    if (!byActor.has(actor)) byActor.set(actor, []);
    byPost.get(key)!.push(edge);
    byActor.get(actor)!.push(edge);
  }
  const focusTerms = discoveryTerms(input.focus);
  const founder = identity(input.profile);
  const founderPosts = [...posts.values()].filter(p => identity(p.author) === founder);
  const seeds = founderPosts.filter(p => {
    const words = terms(p.text);
    return matchesFocus(words, focusTerms);
  }).sort((a,b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  const ideas: Idea[] = [], seen = new Set<string>(), actors = new Set<string>();
  for (const seed of seeds) {
    for (const first of byPost.get(linkedinPostKey(seed.url)!) ?? []) {
      const actor = identity(first.actor);
      if (actor === founder) continue;
      actors.add(actor);
      for (const next of byActor.get(actor) ?? []) {
        const key = linkedinPostKey(next.postUrl)!;
        const other = posts.get(key)!;
        if (identity(other.author) === founder || seen.has(key)) continue;
        seen.add(key);
        const firstExcerpt = excerpt(seed.text, 130), otherExcerpt = excerpt(other.text, 145);
        const draft = treatment(seed, other, input.focus);
        ideas.push({
          id: createHash("sha256").update([founder, input.focus, key].join("\n")).digest("hex").slice(0,16),
          ...draft, title: `${draft.title} · ${excerpt(other.text, 55)}`,
          founderSource: seed.url, audienceSource: other.url,
          reason: `The same person interacted with your post (“${firstExcerpt}”) and another author's post (“${otherExcerpt}”). Their linked activity supports exploring this connection.`,
          offerConnection: `Explore whether the workflow behind “${excerpt(input.focus, 65)}” is relevant to readers of the second post. Their interaction alone gives no purchase signal.`,
          trail: { actor: first.actor, founderInteraction: first.url, founderInteractionAt: first.occurredAt,
            audienceInteraction: next.url, audienceInteractionAt: next.occurredAt,
            founderPostedAt: seed.postedAt, audiencePostedAt: other.postedAt },
        });
        if (ideas.length >= 12) break;
      }
      if (ideas.length >= 12) break;
    }
    if (ideas.length >= 12) break;
  }
  const baseline = !founderPosts.length ? "No dated English posts by this founder were available."
    : !seeds.length ? "No available English founder posts matched the focus words."
    : !actors.size ? `Found ${seeds.length} matching founder posts. No dated interactions by other identifiable people were available on them.`
    : !ideas.length ? `Found ${seeds.length} matching founder posts and ${actors.size} identifiable engagers. No dated English post by another author had a verified interaction from those same people.`
    : `Found ${seeds.length} focus-matching founder posts. Each idea links a founder post to another author's post through the same person's recorded activity.`;
  return { profile: input.profile, baseline, ideas };
}
