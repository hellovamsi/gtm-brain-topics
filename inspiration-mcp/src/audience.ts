import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { franc } from "franc-min";
import { profileUrl } from "./model.js";
import { identity, linkedinPostKey, linkedPost, postSchema, readCacheEvidence } from "./research.js";

const audienceText = z.string().trim().min(1).max(500);
const focusText = z.string().trim().min(1).max(400);
export const audienceInput = {
  audience: audienceText,
  founderProfile: profileUrl.optional().describe("The user’s own LinkedIn profile. Exclude this author from audience discovery."),
  profiles: z.array(profileUrl).max(50).optional().describe("Legacy audience seeds for existing integrations. Omit for automatic discovery; never ask the user to supply these."),
  focus: focusText.optional().describe("Editorial context for the topic selection. Audience discovery is independent of it."),
  evidence: z.object({ posts: z.array(postSchema).max(500) }).optional(),
  requestApproval: z.boolean().optional(),
  maxCredits: z.number().int().min(1).max(100).optional(),
};
const sourceSchema = z.object({
  url: linkedPost, author: profileUrl, postedAt: z.iso.datetime({ offset: true }),
  excerpt: z.string().trim().min(1).max(700),
  membershipEvidence: z.string().max(750).optional(),
});
const topicSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().min(1).max(200), summary: z.string().min(1).max(2000),
  postCount: z.number().int().positive(), authorCount: z.number().int().positive(),
  sources: z.array(sourceSchema).min(1).max(8),
});
export type AudienceTopic = z.infer<typeof topicSchema>;
type Post = z.infer<typeof postSchema>;
type Input = { audience: string; founderProfile?: string; profiles?: string[]; focus?: string; evidence?: { posts: Post[] } };
type Source = z.infer<typeof sourceSchema>;

function uniqueProfiles(profiles: string[]) {
  return [...new Map(profiles.map(url => [identity(url), url])).values()];
}
const functionWords = new Set("a about active an and are as at based by english for from in of on only or people professional professionals speaking the who work working".split(" "));
function descriptors(value: string) {
  return (value.toLowerCase().replace(/non[- ]engineers?/g,"nonengineer").match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter(w => !functionWords.has(w)).map(w => w.replace(/ies$/, "y").replace(/s$/, ""));
}
const independent = /^(?:freelanc(?:e|er|ing)|solopreneur|solo|independent|self|employed|worker)$/;

export async function resolveAudienceProfiles(audience: string, profiles?: string[], icpPath = process.env.INSPIRATION_ICP_PATH ?? resolve("../icp.json")) {
  if (profiles?.length) return uniqueProfiles(profiles);
  try {
    const file = JSON.parse(await readFile(icpPath, "utf8"));
    if (!file.audience?.user_confirmed || typeof file.audience.description !== "string") return [];
    const query = descriptors(audience), declared = new Set(descriptors(file.audience.description));
    const exact = query.length > 0 && query.every(w => declared.has(w)) && [...declared].every(w => query.includes(w));
    // A broad audience can use the owner's narrower regional sample. Additional
    // professions or locations need their own evidence of membership.
    const compatible = query.some(w => independent.test(w)) && query.every(w =>
      independent.test(w) || declared.has(w) || (w === "nonengineer" && /non.engineer/i.test(file.audience.offer_audience ?? "")));
    if (!exact && !compatible) return [];
    if (!Array.isArray(file.research_candidates)) return [];
    return uniqueProfiles(file.research_candidates.flatMap((candidate: {profile_url?: unknown}) => {
      const url = profileUrl.safeParse(candidate.profile_url);
      return url.success ? [url.data] : [];
    }));
  } catch { return []; }
}

export async function audienceSeeds(input: Input, icpPath?: string) {
  const profiles = await resolveAudienceProfiles(input.audience, input.profiles, icpPath);
  const founder = input.founderProfile && identity(input.founderProfile);
  return profiles.filter(url => identity(url) !== founder);
}

function identityEvidence(post: Post, audience: string) {
  const wanted = descriptors(audience);
  if (!wanted.length) return;
  const roles: string[] = [];
  if (post.headline) roles.push(post.headline);
  for (const match of post.text.matchAll(/(?:^|[.!?\n]\s*)(?:as (?:a|an)|i(?:['’]m| am) (?:a|an))\s+([^.!?\n,]{3,110})/gi)) roles.push(match[1]);
  for (const headline of roles) {
    // "I help designers" identifies the audience of the speaker's services.
    // Only the professional identity preceding such a client claim counts.
    const ownRole = headline.split(/\b(?:help(?:s|ing)?|serv(?:e|es|ing)|clients?|for|with|former(?:ly)?)\b/i)[0].trim();
    if (!ownRole || /\b(?:used to|not a|looking for)\b/i.test(ownRole)) continue;
    const words = new Set(descriptors(ownRole));
    if (wanted.every(w => words.has(w) || (independent.test(w) && [...words].some(x => independent.test(x))))) {
      return ownRole.slice(0,240);
    }
  }
}

type Theme = { title: string; pattern: RegExp };
const themes: Theme[] = [
  { title: "Finding and keeping clients", pattern: /\b(client acquisition|lead generation|finding clients|find clients|referrals?|sales pipeline|inbound leads?)\b/i },
  { title: "Pricing and getting paid", pattern: /\b(pricing|hourly rates?|day rates?|raising rates|invoic(?:e|es|ing)|late payments?|payment terms)\b/i },
  { title: "Writing and publishing", pattern: /\b(content calendar|copywriting|publishing|writing posts|writing process|linkedin posts?|content strategy|posting on linkedin|newsletter)\b/i },
  { title: "Client delivery and handoffs", pattern: /\b(client deliverables?|client work|client projects?|onboarding|project briefs?|deliverables?|handoffs?|feedback rounds?)\b/i },
  { title: "Making time for focused work", pattern: /\b(burnout|overwhelm(?:ed)?|workload|deep work|time management|working hours|work.life balance)\b/i },
  { title: "Putting AI to work", pattern: /\b(artificial intelligence|chatgpt|claude code|codex|generative ai|ai tools?|ai agents?)\b/i },
  { title: "Building a community", pattern: /\b(community building|build(?:ing)? a community|my community|our community|community launch|meetups?|networking events?)\b/i },
  { title: "Hiring and delegation", pattern: /\b(hiring|delegat(?:e|ed|ing|ion)|looking for a freelancer|hired|recruiting)\b/i },
];

function excerpt(text: string, limit: number) {
  const line = text.replace(/https?:\/\/\S+/g,"").replace(/\s+/g," ").trim();
  if (line.length <= limit) return line;
  return line.slice(0,limit-1).replace(/\s+\S*$/,"").trimEnd() + "…";
}
function id(value: string) { return createHash("sha256").update(value).digest("hex").slice(0,16); }
function sentences(text: string) {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? []).map(s => s.trim()).filter(s => s.length >= 15 && !/^https?:/.test(s));
}
function sourceFor(post: Post, role: string, theme?: Theme): Source {
  const lines = sentences(post.text);
  const passage = (theme && lines.find(s => theme.pattern.test(s))) || lines[0] || post.text;
  return { url:post.url, author:post.author, postedAt:post.postedAt, excerpt:excerpt(passage,260), membershipEvidence:role };
}

const phraseStop = new Set("about after again alone also another because before being could every first found have having just last like made make many more most much need never only other over really said same some something still take than that their them then there these they thing think this those through time very want well were what when where which while will with work would year your".split(" "));

function postPhrases(text: string) {
  const phrases = new Set<string>();
  for (const sentence of sentences(text)) {
    const words = sentence.toLowerCase().match(/[a-z]+/g) ?? [];
    for (let i=1; i < words.length; i++) {
      const pair = words.slice(i-1,i+1);
      if (pair.every(w => w.length >= 4 && !phraseStop.has(w))) phrases.add(pair.join(" "));
    }
  }
  return phrases;
}

export async function researchAudience(input: Input, options: { cacheDir?: string; icpPath?: string; now?: number } = {}) {
  const now = options.now ?? Date.now();
  const profiles = await audienceSeeds(input, options.icpPath);
  const founder = input.founderProfile && identity(input.founderProfile);
  const verified = new Set(profiles.map(identity));
  const cached = await readCacheEvidence(options.cacheDir,now);
  const all = new Map<string,Post>();
  for (const post of [...cached.posts, ...input.evidence?.posts ?? []]) {
    if (founder && identity(post.author) === founder) continue;
    const key = linkedinPostKey(post.url);
    if (!key || post.language !== "en" || Date.parse(post.postedAt) > now || !excerpt(post.text,260)) continue;
    if (post.text.length >= 90 && franc(post.text) !== "eng") continue;
    all.set(key,post);
  }
  const members = new Map<string,string>();
  for (const post of all.values()) {
    const actor = identity(post.author);
    if (verified.has(actor)) members.set(actor,input.profiles?.length ? "Audience profile supplied by the user." : "Project research candidate for the matching audience. Individual fit may vary.");
    else if (!verified.size) {
      const self = identityEvidence(post,input.audience);
      if (self) members.set(actor,`Author identifies as “${self}”.`);
    }
  }
  const groups = new Map<string, Source[]>();
  const memberPosts = [...all.values()].filter(p => members.has(identity(p.author)))
    .sort((a,b) => Date.parse(b.postedAt)-Date.parse(a.postedAt));
  // Recurring phrases allow interests outside the editorial theme vocabulary to surface.
  const unclassified = new Map<Post, Set<string>>();
  const phraseCounts = new Map<string,number>();
  for (const post of memberPosts) {
    if (themes.some(t => t.pattern.test(post.text))) continue;
    const phrases = postPhrases(post.text);
    unclassified.set(post,phrases);
    for (const phrase of phrases) phraseCounts.set(phrase,(phraseCounts.get(phrase) ?? 0)+1);
  }
  for (const post of memberPosts) {
    const role = members.get(identity(post.author))!;
    const matched = themes.filter(t => t.pattern.test(post.text));
    for (const theme of matched.length ? matched : [undefined]) {
      const source = sourceFor(post,role,theme);
      const common = [...unclassified.get(post) ?? []].filter(p => phraseCounts.get(p)! >= 2)
        .sort((a,b) => phraseCounts.get(b)!-phraseCounts.get(a)! || b.length-a.length)[0];
      const title = theme?.title ?? (common ? common.charAt(0).toUpperCase()+common.slice(1) : excerpt(source.excerpt,85));
      if (!groups.has(title)) groups.set(title,[]);
      groups.get(title)!.push(source);
    }
  }
  const topics = [...groups].map(([title, sources]): AudienceTopic => {
    const byAuthor = new Map<string,Source>();
    for (const source of sources) if (!byAuthor.has(identity(source.author))) byAuthor.set(identity(source.author),source);
    const examples = [...new Set([...byAuthor.values(),...sources])].slice(0,8);
    return { id:id(input.audience.trim().toLowerCase()+"\n"+title), title, postCount:sources.length,authorCount:byAuthor.size,
      summary:`One author wrote, “${sources[0].excerpt}”`, sources:examples };
  }).sort((a,b) => b.authorCount-a.authorCount || b.postCount-a.postCount || Date.parse(b.sources[0].postedAt)-Date.parse(a.sources[0].postedAt)).slice(0,24);
  const baseline = !topics.length ? "No dated English posts could be attributed to this audience. Try a more specific role or import posts that identify the authors and their work."
    : `Mapped ${memberPosts.length} dated English posts by ${members.size} audience members.${verified.size && !input.profiles?.length ? " Sources come from the project’s research-candidate sample." : ""} Counts describe this sample. A post may discuss more than one topic.`;
  return { audience:input.audience,baseline,topics };
}
