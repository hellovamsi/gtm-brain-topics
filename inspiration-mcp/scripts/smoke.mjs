import assert from "node:assert/strict";

const endpoint = process.argv[2];
if (!endpoint) throw new Error("Usage: node scripts/smoke.mjs <MCP endpoint>");

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};
let nextId = 0;

async function request(method, params, notification = false) {
  const id = notification ? undefined : ++nextId;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, method + " returned HTTP " + response.status);
  const sessionId = response.headers.get("mcp-session-id");
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (notification) return;
  const body = await response.text();
  let messages;
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    messages = [];
    for (const event of body.split(/\r?\n\r?\n/)) {
      const data = event.split(/\r?\n/)
        .filter(line => line.startsWith("data:"))
        .map(line => line.slice(5))
        .join("\n");
      if (data) messages.push(JSON.parse(data));
    }
  } else {
    messages = [JSON.parse(body)];
  }
  const result = messages.find(message => message.id === id);
  assert.ok(result, "Missing response for " + method);
  assert.ok(!result.error, method + ": " + JSON.stringify(result.error));
  return result.result;
}

const initialized = await request("initialize", {
  protocolVersion: "2025-11-25",
  capabilities: {},
  clientInfo: { name: "inspiration-map-smoke", version: "1.0.0" },
});
headers["mcp-protocol-version"] = initialized.protocolVersion;
await request("notifications/initialized", {}, true);

const name = "show-inspiration-map";
const { tools } = await request("tools/list", {});
assert.ok(tools.some(item => item.name === "save-markdown"), "Missing workspace-save tool");
const tool = tools.find(item => item.name === name);
assert.ok(tool, "Map tool missing from discovery");
const uri = tool._meta?.ui?.resourceUri ?? tool._meta?.["openai/outputTemplate"];
assert.ok(uri, "Map tool has no linked UI resource");

async function show(args) {
  const result = await request("tools/call", { name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result;
}

const start = await show({});
assert.match(JSON.stringify(start), /audience/i);
const researchName = "research-audience";
const draftName = "draft-audience-topics";
assert.ok(tools.some(item => item.name === researchName), "Missing audience research tool");
assert.ok(!tools.some(item => item.name === draftName), "Removed draft tool was advertised");

const audience = "Independent exhibition designers";
const focus = "A tool for turning project handoffs into repeatable tasks";
const profiles = ["https://www.linkedin.com/in/example-reader/", "https://www.linkedin.com/in/example-designer/"];
const outsider = "https://www.linkedin.com/in/unconnected-reader/";
const date = "2024-01-15T12:00:00Z";
const post = (activity, author, text) => ({
  url: "https://www.linkedin.com/feed/update/urn:li:activity:" + activity + "/",
  author, postedAt: date, text, headline: "Independent exhibition designer", language: "en",
});
const posts = [
  post(101, profiles[0], "How can independent designers keep client feedback in one place during a project?"),
  post(102, profiles[1], "I review client feedback every week and send a summary before handing off a project."),
  post(103, outsider, "A new conference is opening registration for workshop hosts."),
];
async function call(name, args) {
  const result = await request("tools/call", { name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent;
}
const research = await call(researchName, { audience, founderProfile: outsider, evidence: { posts } });
assert.ok(research.topics.length > 0, "Audience sources should yield interests from automatically discovered profiles");
assert.ok(research.topics.every(topic => !topic.samplePost), "Research generated drafts before selection");
const sources = research.topics.flatMap(topic => topic.sources);
assert.ok(sources.some(source => source.url === posts[0].url));
assert.ok(sources.every(source => source.url !== posts[2].url), "Founder appeared among audience sources");
const missing = await call(researchName, { audience, profiles: [outsider], evidence: { posts: [] } });
assert.deepEqual(missing.topics, []);
assert.ok(missing.baseline);

const { contents } = await request("resources/read", { uri });
const html = contents.find(part => part.mimeType?.includes("html"));
assert.ok(html, "Resource did not return HTML");
assert.match(html.text, /<script\b/i, "View has no script");
assert.match(html.text, /inspiration-map/, "HTML does not reference the inspiration map component");

console.log("Passed audience intake, source filtering, map discovery, missing-evidence reporting, draft tool removal, and HTML resource read.");
