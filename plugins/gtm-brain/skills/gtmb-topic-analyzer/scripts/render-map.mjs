// node render-map.mjs ideas.json inspiration.html
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
const { baseline, ideas } = JSON.parse(readFileSync(input, 'utf8'));
const topics = ['Familiar topic', 'Related topic', 'Adjacent topic'];
const angles = ['Variation', 'Different lens', 'Fresh take'];
const escape = value => String(value).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ids = new Set();
if (typeof baseline !== 'string' || !baseline.trim() || !Array.isArray(ideas)) throw Error('Expected baseline and ideas');
for (const idea of ideas) {
  if (!['id','title','reason','source'].every(k => typeof idea[k] === 'string' && idea[k].trim())
      || ids.has(idea.id) || !topics.includes(idea.topic) || !angles.includes(idea.angle))
    throw Error('Each idea needs a unique ID, title, reason, source and valid map coordinates');
  ids.add(idea.id);
}
function choice(idea) {
  return `<label><input type="checkbox" value="${escape(idea.id)}"> <b>${escape(idea.title)}</b></label>
    <details><summary>Why this fits</summary><p>${escape(idea.reason)}</p><p>Source: ${escape(idea.source)}</p></details>`;
}
const rows = [...angles].reverse().map(angle => `<tr><th scope="row">${angle}</th>${topics.map(topic => {
  const group = ideas.filter(i => i.topic === topic && i.angle === angle);
  return '<td>' + (group.map(choice).join('<hr>') || '·') + '</td>';
}).join('')}</tr>`).join('');
writeFileSync(output, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LinkedIn inspiration map</title>
<style>
:root { color-scheme: only light; font: 100%/1.5 system-ui; color: #1b2940; background: #f7f9fc }
body { max-width: 72rem; margin: auto; padding: clamp(.75rem,3vw,2.5rem) }
h1,h2 { letter-spacing: -.035em; line-height: 1.15 }
h1 { font-size: clamp(2rem,4vw,3rem); margin: .4em 0 }
p { margin: .6rem 0 }
.directions { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; margin:1.4rem 0 }
.directions strong { padding:.35rem .75rem; border-radius:2rem }
.topic { background:#cee5ff; color:#164887 }
.angle { background:#ffdfb6; color:#733908 }
table { width:100%; table-layout:fixed; border-spacing:3px }
caption { text-align:left; font-weight:650; margin-bottom:.5rem }
td,th { padding:clamp(.3rem,1.3vw,1.1rem); overflow-wrap:anywhere; vertical-align:top; border-radius:.45rem }
th { text-align:left } th:first-child { width:15% }
thead th { background:#edf2f7 } thead th:nth-child(3){background:#d3e8ff} thead th:nth-child(4){background:#add5ff}
tbody tr { --warm:.05 } tbody tr:nth-child(2){--warm:.14} tbody tr:first-child{--warm:.27}
tbody th { background:rgba(241,147,29,var(--warm)); color:#623408 }
td { --blue:.04; background:linear-gradient(145deg,rgba(244,158,50,var(--warm)),transparent 78%),linear-gradient(285deg,rgba(65,147,239,var(--blue)),white) }
td:nth-child(3){--blue:.16} td:nth-child(4){--blue:.33}
td:has(:checked){box-shadow:inset 0 0 0 2px #315883}
label,summary { cursor:pointer } input { accent-color:#254c80 }
a,summary {color:#204e80} details{margin:.5rem 0} hr{border:0;border-top:1px solid #aeb9ca;margin:1rem 0}
textarea { width:100%; box-sizing:border-box; padding:1rem; border:1px solid #adbccd; border-radius:.45rem; color:#19283b; background:white }
@media(max-width:550px){table{font-size:.875rem;border-spacing:1px}th:first-child{width:18%}}
</style>
<h1>LinkedIn inspiration map</h1><p>Compared with: ${escape(baseline)}</p><div class="directions"><strong class="topic">→ More distant topic</strong><strong class="angle">↑ Fresher perspective</strong><span>Select the ideas you like.</span></div>
<table><caption>Ideas by topic distance and change in perspective</caption><thead><tr><th>Perspective ↑ / Topic →</th>${topics.map(t=>'<th scope="col">'+t+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table>
${ideas.length ? '' : '<p>No sourced ideas available for this map.</p>'}
<h2><label for="picks">Your picks</label></h2><p>Copy these into the chat to continue.</p><textarea id="picks" rows="4" readonly></textarea>
<script>document.addEventListener('change',()=>{document.getElementById('picks').value=Array.from(document.querySelectorAll('input:checked'),i=>i.value+' | '+i.parentElement.textContent.trim()).join('\\n')});</script></html>`);
