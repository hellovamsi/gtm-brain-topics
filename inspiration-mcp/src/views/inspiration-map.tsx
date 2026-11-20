import { Fragment, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useDownload, useOpenExternal, useViewState } from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";
import type { AudienceTopic } from "../audience.js";
import { noveltyLabels, variationLabels, placeInterest } from "../placement.js";
import "./inspiration-map.css";

type Step = "audience" | "focus" | "map" | "review" | "export";
type Workflow = {
  version?: 2 | 3; step?: Step; audience?: string; founderProfile?: string; focus?: string;
  topics?: AudienceTopic[]; baseline?: string; collection?: string; liveRequested?: boolean;
  picks?: string[];
};
function sourceProfile(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.port && !url.username && !url.password &&
      /(^|\.)linkedin\.com$/i.test(url.hostname) && /^\/in\/[^/]+\/?$/.test(url.pathname)) {
      return "https://www.linkedin.com" + url.pathname.replace(/\/$/, "");
    }
  } catch { /* The input field reports the invalid entry. */ }
}

export default function InspirationMap() {
  const { isPending } = useToolInfo<"show-inspiration-map">();
  const { callToolAsync: researchAudience } = useCallTool("research-audience", { timeout: 10 * 60 * 1000 });
  const { callToolAsync: saveToWorkspace } = useCallTool("save-markdown");
  const download = useDownload();
  const openExternal = useOpenExternal();
  const [stored, setSaved] = useViewState<Workflow>({});
  // Old sessions used "focus" for the founder’s work. Their topics were researched from a different audience definition.
  const saved: Workflow = stored.version === 3 ? stored : { audience: stored.audience, focus: stored.focus };
  const [activeId, setActiveId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const researchInFlight = useRef(false);
  const [evidence, setEvidence] = useState("");
  const [showMarkdown, setShowMarkdown] = useState(false);
  const audience = saved.audience ?? "";
  const focus = saved.focus ?? "";
  const topics = (saved.topics ?? []).map(topic => ({ ...topic, ...placeInterest(topic.title, topic.sources[0].excerpt, focus) }));
  const active = topics.find(topic => topic.id === activeId) ?? topics[0];
  const picked = topics.filter(topic => saved.picks?.includes(topic.id));
  let step = saved.step ?? "audience";
  if (!audience) step = "audience";
  else if (step !== "audience" && !focus) step = "focus";
  else if (step === "review" || (step === "export" && !picked.length)) step = "map";
  const md = ["# Selected audience interests", `Audience: ${audience}`, `Focus: ${focus}`,
    ...picked.map(topic => [`## ${topic.title}`, `${topic.novelty} · ${topic.variation}`, topic.summary,
      ...topic.sources.map(source => `- ${source.postedAt.slice(0, 10)} · ${source.url}`)
    ].join("\n\n"))
  ].join("\n\n") + "\n";
  let collectionNotice = "";
  if (saved.collection === "approval_unavailable") {
    collectionNotice = "The Mac approval dialog could not open. Use existing evidence or retry from a signed-in Mac session.";
  } else if (saved.collection === "approval_required" && saved.liveRequested) {
    collectionNotice = "Live collection did not start. Confirm the credit limit in the Mac dialog to fetch, or build a map from existing evidence.";
  } else if (saved.collection === "budget_reached") {
    collectionNotice = "The fetch reached its credit limit. The map uses the evidence available so far.";
  }

  function change(patch: Partial<Workflow>) {
    setSaved(previous => ({ ...(previous.version === 3 ? previous : {audience: previous.audience, focus: previous.focus}), ...patch, version: 3 }));
    setStatus("");
    setShowMarkdown(false);
  }

  function openSource(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openExternal(event.currentTarget.href, { redirectUrl: false });
  }

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = event.currentTarget.elements.namedItem("audience") as HTMLTextAreaElement;
    const field = event.currentTarget.elements.namedItem("founderProfile") as HTMLInputElement;
    const nextAudience = description.value.trim();
    if (!nextAudience) {
      description.setCustomValidity("Describe the audience you want to understand."); description.reportValidity(); return;
    }
    const founderProfile = sourceProfile(field.value.trim());
    if (!founderProfile) {
      field.setCustomValidity("Enter your own LinkedIn profile URL, including https:// and /in/.");
      field.reportValidity(); return;
    }
    if (audience !== nextAudience || founderProfile !== saved.founderProfile) setEvidence("");
    change({ audience: nextAudience, founderProfile, step: "focus", topics: [], picks: [] });
  }

  async function research(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (researchInFlight.current) return;
    const field = event.currentTarget.elements.namedItem("focus") as HTMLTextAreaElement;
    const nextFocus = field.value.trim();
    if (!nextFocus) { field.setCustomValidity("Describe what you’re building or doing."); field.reportValidity(); return; }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestApproval = submitter?.value !== "cache";
    const limit = event.currentTarget.elements.namedItem("maxCredits") as HTMLInputElement;
    const maxCredits = limit.valueAsNumber;
    if (requestApproval && (!Number.isInteger(maxCredits) || maxCredits < 1 || maxCredits > 100)) {
      limit.reportValidity(); return;
    }
    let imported;
    if (!requestApproval && evidence.trim()) {
      try {
        imported = JSON.parse(evidence);
        if (!Array.isArray(imported?.posts)) throw Error();
      } catch {
        setStatus("The evidence JSON must contain a posts array."); return;
      }
    }
    researchInFlight.current = true;
    setBusy(true);
    setStatus(requestApproval ? `Confirm the limit of ${maxCredits} credits in the Mac dialog to fetch audience posts…` : "Reading existing audience evidence…");
    try {
      const result = await researchAudience({ audience, founderProfile: saved.founderProfile, focus: nextFocus,
        requestApproval, ...(requestApproval ? { maxCredits } : {}), ...(imported ? { evidence: imported } : {}) });
      if (result.isError) {
        const message = result.content?.find(block => block.type === "text");
        throw Error(message?.type === "text" ? message.text : "Research could not finish. Check the evidence and try again.");
      }
      const map = result.structuredContent;
      if (!Array.isArray(map?.topics)) throw Error("Research returned no usable map.");
      change({ focus: nextFocus, topics: map.topics, baseline: map.baseline, collection: map.collection,
        picks: [], liveRequested: requestApproval, step: "map" });
      setActiveId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research could not finish.";
      setStatus(requestApproval && /timed?\s*out|timeout|disconnect|connection closed/i.test(message)
        ? "The connection ended before Up2Data confirmed the result. Check the spend ledger before starting another paid fetch." : message);
    } finally { researchInFlight.current = false; setBusy(false); }
  }

  function togglePick(id: string) {
    const current = saved.picks ?? [];
    change({ picks: current.includes(id) ? current.filter(item => item !== id) : [...current, id] });
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(md);
      setStatus("Markdown copied.");
    } catch {
      const field = document.getElementById("markdown") as HTMLTextAreaElement | null;
      field?.focus();
      field?.select();
      setStatus("Use your device’s Copy command on the selected Markdown.");
    }
  }

  async function saveLocally() {
    setBusy(true);
    setStatus("");
    try {
      const result = await saveToWorkspace({ markdown: md });
      if (result.isError || !result.structuredContent?.filename) {
        const message = result.content?.find(block => block.type === "text");
        throw Error(message?.type === "text" ? message.text : "Workspace save did not complete.");
      }
      setStatus(`Saved to local workspace: ${result.structuredContent.filename}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workspace save did not complete.");
      setShowMarkdown(true);
    } finally { setBusy(false); }
  }

  async function saveMarkdown() {
    setBusy(true);
    setStatus("");
    try {
      const result = await download({ contents: [{ type: "resource", resource: {
        uri: "file:///selected-topics.md", mimeType: "text/markdown", text: md,
      } }] });
      if (result.isError) throw Error();
      setStatus("Markdown download requested.");
    } catch {
      setStatus("The download did not complete. Copy the Markdown below to save it.");
      setShowMarkdown(true);
    } finally { setBusy(false); }
  }

  return <main className="inspiration">
    <header><h1>Inspiration map</h1></header>
    {isPending ? <p role="status">Loading your map…</p> : <>
      {step === "audience" && <form onSubmit={start}>
        <label htmlFor="audience">Who is your audience?</label>
        <textarea id="audience" name="audience" required maxLength={500} defaultValue={audience}
          placeholder="For example, independent design consultants who manage client projects"
          onInput={event => event.currentTarget.setCustomValidity("")}/>
        <label htmlFor="founderProfile">Your LinkedIn profile</label>
        <input id="founderProfile" name="founderProfile" type="url" required defaultValue={saved.founderProfile ?? ""}
          placeholder="https://www.linkedin.com/in/your-name/" aria-describedby="discovery-help"
          onInput={event => event.currentTarget.setCustomValidity("")}/>
        <p id="discovery-help" className="meta">We find audience profiles from your description and exclude your own posts from the map.</p>
        <footer><button type="submit">Continue →</button></footer>
      </form>}
      {step === "focus" && <form onSubmit={research}>
        <p className="context"><b>Audience</b> {audience}</p>
        <label htmlFor="focus">What are you building or doing?</label>
        <textarea id="focus" name="focus" required maxLength={400} defaultValue={focus}
          placeholder="For example, a service that helps consultants hand projects over to clients"
          onInput={event => event.currentTarget.setCustomValidity("")} disabled={busy}/>
        <div className="live-fetch"><div><label htmlFor="maxCredits">Maximum credits</label>
          <input type="number" id="maxCredits" name="maxCredits" aria-describedby="credit-help" required min={1} max={100} step={1} defaultValue={10} disabled={busy}/></div>
          <button type="submit" value="live" disabled={busy}>Fetch with Up2Data</button></div>
        <p id="credit-help" className="meta">Fetch English audience posts within this credit limit.</p>
        <details className="evidence"><summary>Existing evidence</summary>
          <p>Use cached evidence, or paste dated English audience posts as JSON. This uses zero credits.</p>
          <details><summary>Evidence format</summary><pre>{JSON.stringify({
            posts: [{ url: "https://www.linkedin.com/feed/update/urn:li:activity:123/", author: "https://www.linkedin.com/in/author",
              postedAt: "2026-01-15T12:00:00Z", headline: "Independent design consultant", text: "Text of the English audience post", language: "en" }]
          }, null, 2)}</pre></details>
          <label htmlFor="evidence">Evidence JSON</label><textarea id="evidence" value={evidence} disabled={busy} onChange={event => setEvidence(event.target.value)} />
          <button type="submit" className="pick" value="cache" formNoValidate disabled={busy}>Build map from evidence</button>
        </details>
        <button type="button" className="pick" disabled={busy} onClick={() => change({ step: "audience" })}>Edit audience</button>
      </form>}
      {step === "map" && <>
        <h2 className="section-title">{active ? "Audience interests" : "No audience topics found"}</h2>
        {collectionNotice && <p className="status" role="status">{collectionNotice}</p>}
        <p className="baseline">{saved.baseline}</p>
        {active && <>
          <section aria-label="Audience interests by topic novelty and variation" className="plot">
            <div className="angle-label">Variation in angle ↑</div><div className="grid">
              {[2, 1, 0].map((row, i) => <Fragment key={row}><span className="row-label">{variationLabels[row]}</span>
                {noveltyLabels.map((label, col) => <div key={col} className={`cell t${col} a${i}`}>
                  {topics.map((topic, index) => topic.variation === variationLabels[row] && topic.novelty === label &&
                    <button type="button" disabled={busy} className="point" key={topic.id} title={topic.title}
                      aria-label={`Explore topic ${index + 1}, ${topic.title}`} aria-pressed={topic.id === active.id}
                      onClick={() => setActiveId(topic.id)}>{index + 1}</button>)}
                </div>)}</Fragment>)}
              <span/>{noveltyLabels.map(label => <span className="col-label" key={label}>{label}</span>)}
            </div><div className="topic-label">Topic novelty relative to your focus →</div>
          </section>
          <article className="detail" aria-live="polite">
            <div className="meta">Topic {topics.indexOf(active) + 1} of {topics.length} · {active.postCount} {active.postCount === 1 ? "post" : "posts"} · {active.authorCount} {active.authorCount === 1 ? "author" : "authors"}</div>
            <h2>{active.title}</h2><p className="meta">{active.novelty} · {active.variation}</p><p>{active.summary}</p>
            <details className="evidence"><summary>Audience sources ({active.sources.length})</summary>
              {active.sources.map(source => <div className="source" key={source.url}>
                <p>{source.excerpt}</p>{source.membershipEvidence && <p className="meta">{source.membershipEvidence}</p>}<a href={source.url} onClick={openSource}>Read post · {source.postedAt.slice(0, 10)} ↗</a> · <a href={source.author} onClick={openSource}>Author ↗</a>
              </div>)}</details>
            <button type="button" disabled={busy} className="pick" aria-pressed={picked.includes(active)} onClick={() => togglePick(active.id)}>
              {picked.includes(active) ? "✓ Selected" : "+ Select topic"}</button>
          </article>
        </>}
        <footer><button type="button" className="pick" disabled={busy} onClick={() => change({ step: "focus" })}>Back to research</button>
          {active && <button type="button" disabled={busy || !picked.length} onClick={() => change({ step: "export" })}>Export topics ({picked.length}) →</button>}</footer>
      </>}
      {step === "export" && <section>
        <h2 className="section-title">Selected topics</h2>
        <ul>{picked.map(idea => <li key={idea.id}>{idea.title}</li>)}</ul>
        <footer><button type="button" className="pick" disabled={busy} onClick={() => change({ step: "map" })}>Back to topics</button>
          <button type="button" className="pick" disabled={busy || !picked.length} onClick={() => void saveMarkdown()}>Download Markdown ↓</button>
          <button type="button" disabled={busy || !picked.length} onClick={() => void saveLocally()}>Save to local workspace</button></footer>
        {showMarkdown && <><label htmlFor="markdown">Markdown to copy</label><textarea id="markdown" readOnly value={md} onFocus={event => event.target.select()} />
          <button type="button" className="pick" onClick={() => void copyMarkdown()}>Copy Markdown</button></>}
      </section>}
    </>}
    {status && <p className="status" role="status">{status}</p>}
  </main>;
}
