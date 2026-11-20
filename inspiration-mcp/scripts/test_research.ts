import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { evidenceSchema, readCacheEvidence, researchFocus, type Evidence } from "../src/research.js";

const founder = "https://www.linkedin.com/in/example-founder", actor = "https://www.linkedin.com/in/example-reader";
const writer = "https://www.linkedin.com/in/example-writer", stranger = "https://www.linkedin.com/in/stranger";
const instant = "2024-05-01T10:00:00Z", now = Date.parse("2024-06-01T10:00:00Z");
const url = (id: number) => "https://www.linkedin.com/feed/update/urn:li:activity:" + id;
const options = { cacheDir: join(tmpdir(), "inspiration-tests-no-cache"), now };
function post(id: number, author: string, text: string): Evidence["posts"][number] {
  return { url: url(id), author, text, postedAt: instant, language: "en" };
}
function edge(id: number, person = actor): Evidence["interactions"][number] {
  return { actor: person, postUrl: url(id), url: url(id) + "?commentUrn=example",
    kind: "comment", occurredAt: instant, language: "en" };
}
test("trace requires the same identified engager and yields distinct grounded treatments", async () => {
  const posts = [
    post(1, founder, "Automate recurring tasks before the client review meeting."),
    post(2, writer, "A task factory handling intake. First write the steps down."),
    post(3, writer, "Client review questions changed our approach, but not every team agreed."),
    post(4, writer, "Small gardens offer a moment of quiet outside."),
    post(5, writer, "A second reader liked another idea."),
    post(6, founder, "A task I completed once."),
    post(7, writer, "A future interaction cannot be used."),
  ];
  const interactions = [edge(1), edge(2), edge(2), edge(3), edge(4), edge(5, stranger),
    { ...edge(7), occurredAt: "2030-01-01T00:00:00Z" }];
  const output = await researchFocus({ profile: founder, focus: "task factory", evidence: { posts, interactions } }, options);
  assert.deepEqual(output.ideas.map(i => [i.topic, i.angle]), [
    ["Familiar topic", "Variation"], ["Related topic", "Fresh take"], ["Adjacent topic", "Different lens"],
  ]);
  const qualified = await researchFocus({ profile: founder, focus: "task factory for solopreneurs", evidence: { posts, interactions } }, options);
  assert.equal(qualified.ideas.length, output.ideas.length);
  assert.match(qualified.ideas[0].title, /solopreneurs/i);
  assert.ok(output.ideas.every(idea => !("samplePost" in idea)));
  assert.ok(output.ideas.every(i => i.trail?.actor === actor && i.founderSource === url(1)));
  assert.match(output.baseline, /1 focus-matching/);
  assert.equal((await researchFocus({ profile: founder, focus: "task factory", evidence: { posts, interactions: [edge(1), edge(2, stranger)] } }, options)).ideas.length, 0);
});

test("collector caches require unexpired records, English text and matching comment owner", async () => {
  const dir = await mkdtemp(join(tmpdir(), "inspiration-cache-test-"));
  const text = "Every week we review the project together and write down what we learned from the conversation.";
  const german = "Wir schreiben jede Woche auf, welche Aufgaben wir gemeinsam abschließen und was wir dabei gelernt haben.";
  async function cache(id: number, endpoint: string, input: unknown, data: unknown, expired = false) {
    await writeFile(join(dir, id.toString(16).padStart(32, "0") + ".json"), JSON.stringify({
      endpoint, input, data, fetched_at: instant, expires_at: expired ? instant : "2025-01-01T00:00:00Z",
    }));
  }
  const providerPost = (id: number, author: string, body: string) => ({
    url: url(id), urn: String(id), author: { url: author }, text: body, posted_at: instant,
  });
  const comment = (who: string, body: string, target: number) => ({
    commenter: { url: who }, text: body, posted_at: instant, target_post: { url: url(target), urn: String(target) },
  });
  await cache(1, "profiles/activity", { url: founder, kind: "posts" }, { posts: [providerPost(10, founder, text)] });
  await cache(2, "posts/enrich", { urn: "12" }, providerPost(12, writer, text));
  await cache(3, "posts/engagement/comments", { urn: "10" }, { comments: [comment(actor, text, 10)] });
  await cache(4, "profiles/activity", { url: actor, kind: "comments" }, { url: actor,
    comments: [comment(actor, "project", 12), comment(stranger, text, 12), comment(actor, german, 12)] });
  await cache(5, "posts/enrich", { urn: "13" }, providerPost(13, writer, german));
  await cache(6, "posts/enrich", { urn: "14" }, providerPost(14, writer, text), true);
  const evidence = await readCacheEvidence(dir, now);
  assert.equal(evidence.posts.length, 2);
  assert.equal(evidence.interactions.length, 2);
  const output = await researchFocus({ profile: founder, focus: "project" }, { cacheDir: dir, now });
  assert.equal(output.ideas.length, 1);
  assert.equal(output.ideas[0].trail?.audienceInteraction, url(12));
  assert.equal(evidenceSchema.safeParse({ posts: [], interactions: [{ ...edge(1), url: url(2) }] }).success, false);
});
