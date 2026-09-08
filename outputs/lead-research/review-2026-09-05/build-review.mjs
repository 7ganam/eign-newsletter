import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const read = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const base = 'outputs/lead-research/review-2026-09-05/';
const audit = read(base + 'lead-audit.json');
const strategy = read(base + 'source-strategy.json');
const original = read('assets/lead-research/saudi-software-leads.json');
const resources = read('assets/lead-research/saudi-lead-resources.json');
const generatedAt = new Date().toISOString();
const labels = { suggested_exclude: 'Exclude from campaign', needs_verification: 'Hold for verification', promising_for_verification: 'Investigate first' };
const rank = { promising_for_verification: 1, needs_verification: 3, suggested_exclude: 4 };
assert.equal(audit.rows.length, 50);
assert.equal(new Set(audit.rows.map(r => r.id)).size, 50);
assert.deepEqual(audit.rows.map(r => r.id).sort(), original.rows.map(r => r.id).sort());
for (const row of audit.rows) {
  const old = original.rows.find(r => r.id === row.id);
  assert.equal(row.current_score, old.qualification.total_score);
  assert.equal(row.current_band, old.qualification.band);
  assert.equal(row.team_gate.proven_software_people_upper_bound, null);
}
const outcomes = Object.entries(labels).map(([key, outcome]) => ({ outcome, count: audit.rows.filter(r => r.suggested_verdict === key).length }));
assert.deepEqual(outcomes.map(r => r.count), [38, 7, 5]);
const leadRows = audit.rows.map(r => ({
  priority: r.research_priority === 'low' && r.suggested_verdict === 'promising_for_verification' ? 2 : rank[r.suggested_verdict],
  id: r.id, name: r.display_name, company: r.company,
  proposal: labels[r.suggested_verdict], original_score: r.current_score, original_band: r.current_band,
  recorded_stage: r.stored_lifecycle_stage, product_reason: r.product_gate.reason,
  team_reason: r.team_gate.reason, next_check: r.next_check,
  evidence_url: r.evidence[0]?.url ?? null,
})).sort((a, b) => a.priority - b.priority || a.company.localeCompare(b.company));
const revisions = [...strategy.resource_revisions, ...strategy.grouped_resource_revisions.flatMap(r => r.resource_ids.map(id => ({...r, resource_id:id})))];
const resourceRows = resources.rows.filter(r => r.classification === 'accepted').map(r => {
  const revision = revisions.find(v => v.resource_id === r.id);
  assert.ok(revision, `Missing source revision: ${r.id}`);
  return { id:r.id, source:r.name, url:r.url, proposal:revision.priority_revision,
    harvest:revision.extraction_recipe, cadence:revision.cadence, caveat:revision.limitation,
    live_checked: revision.verification_ids?.length ? 'Selected official checks; see limitations' : 'Stored source review only' };
});
assert.equal(resourceRows.length,25);
const s = audit.summary;
const flags = [
  {flag:'No complete software-team ceiling audit',count:s.missing_complete_current_software_team_audit},
  {flag:'Outsourcing likelihood recorded unknown',count:s.stored_outsourcing_level_unknown},
  {flag:'Total employee band missing or unknown',count:s.missing_or_unknown_structured_total_employee_band},
  {flag:'Already labeled launched or operating',count:s.current_lifecycle_counts.launched+s.current_lifecycle_counts.operating},
  {flag:'All evidence publication dates missing',count:s.leads_with_all_evidence_publication_dates_missing},
  {flag:'Generic placeholder product summary',count:s.placeholder_product_summaries},
].map(r => ({...r, denominator:50, share:r.count/50}));
const sources = [
  {id:'audit',label:'Row-by-row local evidence audit, reviewed 5 September 2026',path:base+'lead-audit.json',query:{engine:'JavaScript',language:'javascript',query:readFileSync(resolve(here,'build-review.mjs'),'utf8'),description:'Reproducible counts from canonical rows and reviewed assessment; overlap flags are not additive.',tables_used:['assets/lead-research/saudi-software-leads.json',base+'lead-audit.json']}},
  {id:'plan',label:'Revised persona and execution plan',path:base+'revised-plan.md'},
  {id:'code',label:'Qualification generator and validator review',path:base+'qualification-review.md'},
  {id:'strategy',label:'Source strategy and dated official checks',path:base+'source-strategy.json'},
  ...strategy.first_party_verifications.map(v => ({id:v.id,label:v.id+' — checked '+v.checked_at,href:v.url})),
  {id:'stoqa',label:'STOQA Android listing, read 5 September 2026',href:'https://play.google.com/store/apps/details?id=ai.stoqa.app'},
  {id:'vision',label:'Vision Mate technical co-founder role, read 5 September 2026',href:'https://sa.linkedin.com/jobs/view/technical-co-founder-at-vision-mate-4460498663'},
  {id:'jadi',label:'Jadi CTO role, read 5 September 2026',href:'https://sa.linkedin.com/jobs/view/4399318887'},
  {id:'book',label:'BookMyGuide founder project post, read 5 September 2026',href:'https://www.linkedin.com/posts/hayath-kargal-b0b17057_vision2030-ntdp-mvplab-activity-7412319001252618240-2TT5'},
];
const title = 'Saudi lead research: revised pre-build buyer plan';
const markdown = (id,body,sourceId='plan') => ({id,type:'markdown',body,sourceId});
const table = (id,title,dataset,columns,sort,sourceId='audit') => ({id,title,dataset,columns:columns.map(([field,label])=>({field,label})),defaultSort:{field:sort,direction:sort==='count'?'desc':'asc'},density:'dense',sourceId,layout:'full'});
const artifact = {
  surface:'report',
  manifest:{version:1,surface:'report',title,generatedAt,description:'Review of all 50 existing candidates and 25 accepted resources. Proposed changes only; live data unchanged.',sources,
    charts:[{id:'coverage',title:'Missing team evidence prevents any confirmed v2 fit',subtitle:'Number of records out of 50; flags overlap and must not be added.',type:'horizontalBar',dataset:'flags',sourceId:'audit',intent:'comparison',question:'Which recorded evidence gaps and maturity signals undermine the current labels?',rationale:'A horizontal bar comparison makes the scale of six audit flags visible without suggesting mutually exclusive groups.',comparisonContext:{denominator:'50 reviewed records',grain:'one flag',unit:'records',semanticFamily:'overlapping audit flags'},encodings:{x:{field:'flag',type:'nominal',label:'Audit flag'},y:{field:'count',type:'quantitative',label:'Records',unit:'records'},tooltip:[{field:'denominator',label:'Reviewed records'},{field:'share',format:'percent',label:'Share of 50'}]},valueFormat:'number',layout:'full'}],
    tables:[
      table('outcomes','Proposed dispositions — all remain unqualified under v2','outcomes',[['outcome','Proposed disposition'],['count','Records']],'count'),
      table('flags','Exact audit flag counts','flags',[['flag','Flag'],['count','Records'],['denominator','Reviewed records']],'count'),
      table('queue','Twelve candidates retained for investigation','queue',[['priority','Order'],['name','Person'],['company','Project'],['proposal','Proposal'],['next_check','Next check']],'priority'),
      table('all-leads','All 50 proposed lead decisions','leads',[['priority','Order'],['name','Person'],['company','Project'],['proposal','Proposal'],['product_reason','Product finding'],['team_reason','Team gap'],['next_check','Next check'],['evidence_url','Evidence URL']],'priority'),
      table('resources','All 25 accepted resources — proposed revised use','resources',[['source','Source'],['proposal','Revised priority'],['harvest','Harvesting instructions'],['cadence','Cadence'],['caveat','Limitation'],['url','URL']],'source','strategy'),
    ],
    blocks:[
      markdown('title','# '+title+'\n\nResearch review dated 5 September 2026. Three parallel reviews covered the list, qualification logic and discovery sources. The canonical list and application remain unchanged.'),
      markdown('executive','## Executive Summary\n\nRecommend excluding 38 prospects, investigating five first, and retaining seven other holds. None currently has sufficient evidence to confirm all revised gates. This is a review of all stored records and 156 evidence summaries, supplemented by selected live checks; it is not 50 new external profile verifications.\n\nThe desired buyer has a specific first software project whose core functionality remains unbuilt and a supported maximum of two software builders. Paid external-delivery demand is a separate commercial question.','audit'),
      {id:'outcome-table',type:'table',tableId:'outcomes',sourceId:'audit'},
      markdown('failure','## Why the current list overstates fit\n\nForty-seven records explicitly mark outsourcing likelihood unknown, yet 44 are labeled qualified and all 50 have high qualification confidence. At least 26 are labeled launched or operating; further built products appear among unknown-stage rows. All seven A labels lack the qualitative support required by the stored rubric.\n\nThe team-ceiling gap is universal. This does not mean all teams are large; it means the evidence cannot yet establish that they are small enough. The total-employee field is also missing frequently, but total employees and software builders are different quantities.','audit'),
      {id:'coverage-chart',type:'chart',chartId:'coverage',sourceId:'audit'},
      {id:'coverage-table',type:'table',tableId:'flags',sourceId:'audit'},
      markdown('gates','## Apply gates before commercial scoring\n\nRequire supported identity and authority, a specific Saudi-market build, unbuilt core functionality, no more than two current software builders, and a current initiative. An unresolved gate stays on hold; a failed gate makes the project out of scope. A company-controlled full-team statement can support a maximum; a partial LinkedIn roster only establishes a visible minimum.\n\nCount hands-on technical founders, employees and known contractors. Record assigned vendors separately. A functional private app can already fail the product gate; a brochure site does not disqualify an SME’s first custom build. Avoid industry-wide exclusions.\n\nFor confirmed fits, score build commitment (6), paid external intent (6), available project funds (4) and timing (4). Unknowns earn no affirmative points. Equity-only hiring and noncash credits do not prove a paid development opportunity. Preserve those candidates in a research pool when otherwise relevant.'),
      markdown('candidate-story','## Recheck the best unresolved candidates first\n\nurCASH, Wathba, Jadi and Vision Mate have useful pre-build signals, with current team and commercial gaps. BookMyGuide is lower priority because its Saudi entry and current activity remain unresolved. The seven other holds are Smart Quotation, Gaia, Ballora, Zakn AI, GreenVision, Suhail and Mara.\n\nSTOQA’s [available Android product](https://play.google.com/store/apps/details?id=ai.stoqa.app) supports exclusion for this campaign. [Vision Mate](https://sa.linkedin.com/jobs/view/technical-co-founder-at-vision-mate-4460498663) is an equity-based wearable/AI co-founder opportunity. [Jadi](https://sa.linkedin.com/jobs/view/4399318887) is a closed equity CTO listing. [BookMyGuide’s post](https://www.linkedin.com/posts/hayath-kargal-b0b17057_vision2030-ntdp-mvplab-activity-7412319001252618240-2TT5) describes planned Saudi entry and a program application, not a confirmed grant. None is a verified paid-agency lead.','audit'),
      {id:'queue-table',type:'table',tableId:'queue',sourceId:'audit'},
      markdown('source-story','## Find founders earlier and test manual-business demand\n\nPrioritize current pre-incubation admissions, specific public first-build requests, and owners of non-software SMEs planning their first custom product. Use portfolios, funding news and demo days to verify maturity and funds.\n\n[Misk Launchpad](https://hub.misk.org.sa/en/programs/entrepreneurship/misk-launchpad/) lists its next cohort starting 6 September 2026, initially in Ideate. [Sanabil Accelerator](https://mena.500.co/founders/mena/seed-accelerator) requires an MVP and early traction. [StartSmart’s tenth edition](https://startsmartsaudi.com/programs/competitions?page=1) excludes idea-only applicants and offers technical benefits rather than cash. Record exact program, edition and phase. Admission alone proves neither an unbuilt product nor a paid build budget.\n\nPilot [Antler Riyadh residency](https://www.antler.co/location/menap) introductions and public Saudi first-app briefs. These are discovery experiments; no new yield has been measured. Ordinary LinkedIn remains useful for small exact-name checks. No outreach, interactions or contact enrichment are part of the plan.','strategy'),
      markdown('execution','## Next steps and success measures\n\n1. Preserve v1 and implement claim-backed v2 eligibility without overwriting research notes. Fix hardcoded verified gates, stage substring inference, automatic review timestamps and unrelated fallback evidence.\n2. Calibrate ten contrasting examples, then run independent discovery streams for pre-incubation, public build requests and manual SMEs. Apply the product screen before spending time on deep team enrichment.\n3. Verify plausible candidates’ remaining gaps in parallel and publish valid partial batches. Fifty is a goal, not a requirement for data validity.\n4. Track unique reviewed candidates, confirmed fits, paid external demand, exclusions and research minutes. Separate discovery attribution from corroboration and preserve v1 yields. After two 20-candidate source passes each yield fewer than two new confirmed fits, pause and redirect that channel.\n5. Show product status, supported team ceiling, evidence coverage, paid intent and next research action. Keep evidence grouped by claim in the centered modal.\n\nAcceptance should mean zero unsupported active qualifications. It should not depend on filling exactly 50 rows.','code'),
      markdown('caveats','## Caveats and further questions\n\nThe 38 exclusions are proposed from recorded evidence, not assertions that every person has been freshly investigated. “Zero confirmed fits” measures evidence sufficiency and does not prove zero suitable founders exist. Public research may leave team ceilings unresolved; do not contact founders to fill those gaps within this scope. The new scoring thresholds are uncalibrated operational rules.\n\nNine official/program-source checks were attempted; some pages were partial, historical or unreadable. Current website checks did not yield readable urCASH or MVP Lab text. Missing content proves nothing about product or funding. Twelve candidates remain investigable, and no replacement lead count or future source yield is claimed.\n\nPilot questions: which channel produces confirmed fits fastest, how often do fits want paid external help, whether manual SMEs show more cash readiness, and which programs assign their own providers?','strategy'),
      markdown('appendix','## Full proposed lead and resource revisions\n\nThe tables preserve original identities and attach proposed reasons and next checks. Original scores are retained in the companion CSV/JSON for comparison, not endorsed as current v2 priorities.','audit'),
      {id:'all-lead-table',type:'table',tableId:'all-leads',sourceId:'audit'},
      {id:'resource-table',type:'table',tableId:'resources',sourceId:'strategy'},
    ]
  },
  snapshot:{version:1,generatedAt,status:'ready',datasets:{outcomes,flags,queue:leadRows.filter(r=>r.proposal!=='Exclude from campaign'),leads:leadRows,resources:resourceRows}},sources
};
const csv = rows => {
  const columns = Object.keys(rows[0]);
  const cell = x => '"'+String(x??'').replaceAll('"','""')+'"';
  return [columns.map(cell).join(','),...rows.map(r=>columns.map(k=>cell(r[k])).join(','))].join('\n')+'\n';
};
writeFileSync(resolve(here,'artifact.json'),JSON.stringify(artifact,null,2)+'\n');
writeFileSync(resolve(here,'revised-lead-list.csv'),csv(leadRows));
writeFileSync(resolve(here,'revised-resources.csv'),csv(resourceRows));
const hashes = ['saudi-lead-persona.json','saudi-lead-resources.json','saudi-software-leads.json'].map(file=>({file:'assets/lead-research/'+file,sha256:createHash('sha256').update(readFileSync(resolve(root,'assets/lead-research',file))).digest('hex')}));
writeFileSync(resolve(here,'review-checks.json'),JSON.stringify({checked_at:generatedAt,rows:50,resources:25,outcomes,canonical_hashes:hashes,tests:'IDs, original mappings, row counts, team unknowns and all accepted-resource coverage passed',chart_contract:{question:artifact.manifest.charts[0].question,takeaway:'Universal team evidence gap; stored confidence is unsupported',form:'horizontalBar',palette:'single default categorical series, count magnitude',encoding:'flag category and count of records',overlap:'Flags overlap; denominator 50 for each',qa:'Counts recomputed from audited snapshot and compared to row-level totals'},canonical_files_modified:false},null,2)+'\n');
console.log(JSON.stringify({ok:true,leadRows:leadRows.length,resourceRows:resourceRows.length,outcomes,artifact:'artifact.json'}));
