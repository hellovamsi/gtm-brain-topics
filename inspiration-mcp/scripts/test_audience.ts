import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { researchAudience, resolveAudienceProfiles } from "../src/audience.js";

const author = "https://www.linkedin.com/in/example-reader";
const outsider = "https://www.linkedin.com/in/example-outsider";
const when = "2024-01-01T10:00:00Z";
const options = { cacheDir:join(tmpdir(),"no-inspiration-cache-for-tests"), icpPath:join(tmpdir(),"no-icp-for-tests"),now:Date.parse("2024-12-01T00:00:00Z") };
function post(n:number,who:string,text:string,headline?:string) {
  return {url:`https://www.linkedin.com/feed/update/urn:li:activity:${n}`, author:who, postedAt:when, language:"en" as const, text,headline};
}

test("member posts drive interests independently of focus and founder interactions",async()=>{
  const evidence={posts:[
    post(101,author,"Late payments have made me rethink my invoice terms."),
    post(102,author,"This week's meetup was the first one I organized."),
    post(103,outsider,"Hiring staff is the hardest part of my week."),
    post(104,author,"Die Rechnungen werden oft zu spät bezahlt, und wir müssen deshalb jeden Monat nachfragen, ob die Menschen das Geld endlich überwiesen haben."),
    {...post(105,author,"Hiring staff is the hardest part of my week."),postedAt:"2028-01-01T00:00:00Z"},
  ]};
  const request = {audience:"designers",profiles:[author],evidence};
  const map=await researchAudience({...request,focus:"cloud software"},options);
  assert.deepEqual(map,await researchAudience({...request,focus:"music lessons"},options));
  assert.equal(map.topics.length,2);
  assert.ok(map.topics.every(t=>t.authorCount===1 && t.postCount===1 && t.sources[0].author===author));
  assert.ok(map.topics.every(t=>!("samplePost" in t)));
});

test("discovery relies on the author's own role, never a mention of the target",async()=>{
  const evidence={posts:[
    post(201,author,"I am a ceramicist. Mixing glazes takes up most of the afternoon."),
    post(202,author,"Getting paid for custom pieces means improving my invoices."),
    post(203,outsider,"I help ceramicists understand pricing.","Coach for ceramicists"),
  ]};
  const map=await researchAudience({audience:"ceramicists",evidence},options);
  assert.ok(map.topics.length>=2);
  assert.ok(map.topics.every(t=>t.sources.every(s=>s.author===author)));
  const empty=await researchAudience({audience:"geologists",evidence},options);
  assert.deepEqual(empty.topics,[]);
});

test("only compatible audience definitions use project candidates",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"audience-settings-"));
  const file=join(dir,"icp.json");
  await writeFile(file,JSON.stringify({audience:{user_confirmed:true,description:"Solopreneurs and freelancers active in Berlin"},research_candidates:[{profile_url:author}]}));
  assert.deepEqual(await resolveAudienceProfiles("Berlin freelancers",undefined,file),[author]);
  assert.deepEqual(await resolveAudienceProfiles("Solar engineers",undefined,file),[]);
  assert.deepEqual(await resolveAudienceProfiles("London freelancers",undefined,file),[]);
  assert.deepEqual(await resolveAudienceProfiles("London freelancers",[outsider],file),[outsider]);
});
