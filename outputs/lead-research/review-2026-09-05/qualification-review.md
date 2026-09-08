# Qualification and implementation review

Reviewed 2026-09-05. This is a read-only review of the current local persona, canonical leads, builder, validator, API and types. It does not claim a fresh web verification of any named person. No canonical data or application files were changed.

## Conclusion

The current list is unsuitable as a confirmed buyer list for the user's clarified target: a Saudi-market decision-maker whose intended core software product is still unbuilt and who has at most two software builders. The stored system still implements v1. Its tests establish structural consistency and arithmetic, not persona fit or truth of the underlying claims.

The previous conversational v2 proposal improves the target but needs corrections: private alpha can already be a built product; zero visible engineers does not establish a team-size ceiling; technical scarcity does not establish willingness to buy; industry labels do not determine product maturity; and generic cohort participation does not establish an available build budget.

## Verified local observations

- 50 rows: 12 labeled launched, 14 operating, 18 unknown, 3 beta, 2 pre-company, and 1 idea.
- The 26 explicitly live labels are a lower bound on maturity problems. STOQA is labeled `unknown` despite stored evidence describing its Android launch and live paid product.
- 47 of 50 outsourcing dimensions are explicitly `unknown`; 44 rows are nevertheless `qualified`; all 50 have `qualification_confidence: high`.
- There are 156 evidence records, 119 with no publication date. A fresh observation date does not establish when the reported event happened.
- No row has a populated `founder_role_started_at`, although the new-founder lane is defined as starting within 12 months.
- STOQA receives product intent 6 for having launched and updated an app. The persona's own level-6 rule instead requires an explicit builder/vendor/technical-partner request or dated build brief. Its budget 5 cites investment and traction, although that level requires an explicit budget/procurement/product grant/paid pilot tied to the build. Its one-point team penalty is not the five-point sufficient-team penalty defined in the persona.
- Ballora and GreenVision each receive budget 3 for program development, mentoring and prize participation even though their descriptions explicitly say no cash build allocation is claimed. These are ecosystem-support signals, not demonstrated purchasing resources.

Three diagnostic probes cloned the dataset in memory and called the existing validator. All returned an empty error array: removing every identity/company/scored-dimension evidence reference from a lead; setting all its evidence dates to `2099-99-99`; replacing all its evidence URLs with one publisher while alternating source-type labels. No files were changed by these probes.

## Five prioritized implementation findings

1. **P1 — Eligibility is asserted rather than evaluated.** `scripts/build-lead-research.ts:352` sets every promoted worker row's identity to verified; lines 379–398 hardcode Saudi fit, authority and software fit to confirmed, infer high confidence from evidence count, and stamp a manual review. Worker gate objects are read for references at lines 228–235, but their outcomes are not checked. `scripts/lib/lead-research.ts:102` checks those asserted strings without requiring gate-specific supporting claims. Product-unbuilt and maximum technical-team gates do not exist in `src/leadResearchTypes.ts:63` or `:86`. A worker promotion can therefore look conclusively qualified despite unknown core eligibility. Fix: independently evaluate typed claim-backed gates; preserve unknown/conflicting outcomes; derive eligibility and confidence from those outcomes.

2. **P1 — Scoring validates sums, not rubric adherence or relevant proof.** `scripts/lib/lead-research.ts:18` only adds supplied numbers; lines 130–138 check bounds and arithmetic. `scripts/build-lead-research.ts:314` copies worker scores and substitutes the first unrelated evidence item whenever matching score references are absent (line 321). `levelFor` at lines 271–275 derives confidence from scores and catches score zero as `unknown` before its `refuted` branch can run. This is the mechanism behind established products earning high build-intent scores. Fix: derive scores from explicit claim types and rule IDs, fail positive scores with no relevant support, separate unknown from refuted, and make disqualification non-compensable by funding or timing.

3. **P1 — Source independence and claim coverage are not represented.** `scripts/lib/lead-research.ts:112` equates two URLs plus two source-type labels with two independent sources. A founder profile, company page and app-store description can all be controlled by the same company. `scripts/build-lead-research.ts:83` mixes source type with publisher-independence labels. Lines 72–92 drop later claims sharing a URL, while lines 249–256 manufacture generic evidence summaries for unresolved URL references. Gate and dimension reference arrays can be empty without failing validation (lines 119–128). Fix: model publisher/control group, information origin, exact claim relationships and copied/syndicated material separately; keep multiple claims per source; never manufacture support from a URL alone. A generic program homepage can substantiate program rules but cannot corroborate a particular participant's team, budget or stage.

4. **P1 — Stage and freshness can be misclassified or manufactured.** `scripts/build-lead-research.ts:278` uses substring precedence: “application” becomes building; “funded” becomes launched; “pre-launch” contains launch. Missing dates are replaced with the fixed 2026-09-03 observation date at lines 85–86; manual review/next-review dates are globally stamped at lines 393–399. `scripts/lib/lead-research.ts:48` only regex-checks dates. `server/leadResearch.ts:61` counts staleness solely from an editable next-review date, so an old build event can appear fresh. Fix: explicit product-stage claims and actual event dates, with date precision/ranges; compute freshness from material claim validity, not page retrieval or a rescheduled reminder. Unknown event dates earn no recency points.

5. **P2 — Quotas and attribution distort evidence quality and source yield.** `scripts/build-lead-research.ts:441` truncates by 30/10/10 lane quotas and line 470 refuses any dataset below 50; the validator also requires exact counts (`scripts/lib/lead-research.ts:75`, `:81`, `:143`). This encodes a completion target that conflicts with the no-padding rule and prevents safely publishing a smaller corrected set. Builder line 341 gives all LinkedIn-worker candidates a generic LinkedIn-search source; lines 474–478 infer discovery from exact evidence URL matches and count every linked source as yielding the lead. The API uses stored source yields (`server/leadResearch.ts:55`) even after editable statuses change, and permits `rejected` on rows it continues to return in the full lead count (lines 115–127, 58). Fix: make counts research targets, not validity conditions; model discovery versus corroboration; derive current eligible yield and separate manual research workflow from calculated eligibility.

## Recommended v2 persona and gate policy

The unit of qualification should be a **specific person + organization/project + proposed core build**, not a founder's general profile. For an SME, an existing business website or an off-the-shelf booking tool need not disqualify a separate, documented first custom product. Existing production software performing the intended core use case does disqualify this campaign.

| Gate | Pass | Hold | Exclude from this campaign |
|---|---|---|---|
| Identity and authority | Current person/project match and decision role supported by relevant evidence | Ambiguous identity or project representative without budget authority | Refuted identity or departed/non-authoritative role |
| Saudi-market relevance | Documented HQ, operations or intended Saudi launch tied to this project | Only generic program eligibility or nationality assumption | Evidence establishes another market with no Saudi activity |
| Specific build | Named use case and intended core functionality | Vague entrepreneurial interest or generic “AI startup” | No software buying need |
| Core product unbuilt | Recent direct description of idea/design/manual pilot or clearly nonfunctional prototype; core functionality remains to be implemented | Unknown stage; functional prototype/private alpha whose scope is unclear | Existing functional core product, live app or production platform for this initiative |
| Software capacity ≤2 | Recent positive team evidence supporting an upper bound of two current software builders, cross-checked against the visible roster | 0–2 visible builders but no supported upper bound, incomplete roster, unclear CTO/contractor roles | At least three confirmed software builders; or an already-assigned delivery provider that removes the relevant delivery gap |
| Current initiative | Explicit build signal with an actual event date within 180 days, or a still-future documented milestone | 181–365-day signal without continuation; undated intent; conflicting dates | Explicitly abandoned/finished initiative |

“Positive team evidence” can be a recent founder statement describing the whole team and its roles, a complete first-party project-team roster, or a similarly explicit program team record corroborated by current profiles. Call it **supported by public evidence**, never a payroll audit. An incomplete LinkedIn People page establishes only a visible lower bound. Count active software-building founders, employees and known contractors; record advisers separately. Technical experience alone does not prove that a person currently works on delivery, and a CTO title alone does not establish how much capacity they supply.

Private alpha is not automatically eligible: a usable private product may already satisfy “app built.” Clickable design, static demonstration and a manual/no-code experiment require explicit descriptions of what is still unbuilt. Do not reject all SaaS/AI/fintech founders by industry; reject the evidenced mature product or delivery capacity. This retains genuine pre-build founders in those sectors.

Budget is a separate commercial qualification question. Unknown budget should retain an otherwise relevant person in the research pool, with no budget points and no claim of buyer readiness. Equity-only technical-cofounder searches provide product intent but no paid-vendor intent. Explicit inability to pay means nurture/defer, not a permanent identity-level exclusion. Program membership, mentorship, fundraising targets, prize eligibility and portfolio assets do not establish cash available for development.

## Recommended scoring after gates

Use eligibility and commercial priority as separate outputs. A missing critical gate produces `hold` and no A/B qualification regardless of score. An evidenced failed gate produces `out_of_scope`; do not use compensating penalties. Once every persona gate passes, score commercial evidence:

| Dimension | Max | Suggested levels |
|---|---:|---|
| Specific build commitment | 6 | 0 unknown; 2 specific problem/use case; 4 planned scope or MVP milestones; 6 concrete brief, approved build project or active delivery selection |
| Paid external-delivery intent | 6 | 0 unknown/equity-only; 2 explicitly considering external help; 4 seeking proposals/vendor/paid builder; 6 current explicit procurement or paid delivery request |
| Available project funds | 4 | 0 unknown/noncash support; 1 operating business with plausible capacity but no allocation; 2 actual available cash funding or paid pilot relevant to the venture; 4 explicit allocation for this build |
| Timing | 4 | 0 unknown, inactive or >180 days; 1 within 91–180 days; 2 within 31–90 days; 4 within 30 days or a current documented delivery-selection deadline |

Suggested A: ≥15, all gates supported, paid external intent ≥4, project funds ≥2, actual trigger ≤90 days, no unresolved contradiction, second review complete. B: 10–14 with all gates supported; a higher numeric total missing an A prerequisite stays B with the exact unmet condition displayed. Lower scores remain fit-confirmed research/nurture records, not active commercial priorities. Zero versus one versus two engineers should be a filter and context, not six automatic “buying likelihood” points.

These are proposed operational thresholds to calibrate against examples. They are not measured purchase probabilities. Freeze a rule version and assess a 10-candidate pilot before expanding the search.

## Minimal v2 evidence and qualification schema

```ts
type Claim = {
  id: string
  subject_id: string          // person, company, team or specific build
  field: string              // e.g. core_product_status, total_software_builders
  value: unknown | null
  status: 'supported' | 'unknown' | 'conflicted' | 'refuted'
  supporting_evidence_ids: string[]
  contradicting_evidence_ids: string[]
  event_date: string | null
  event_date_precision: 'day' | 'month' | 'year' | 'range' | 'unknown'
  event_date_end: string | null
  valid_until: string | null
}
type Evidence = {
  id: string
  source_id: string
  source_url: string
  publisher_id: string
  control_group_id: string
  information_origin_id: string  // copies share an origin
  source_kind: string
  relationship: 'first_party' | 'independent' | 'discovery_only'
  published_at: string | null
  observed_at: string
  locator: string | null         // section, PDF page or exact post
  paraphrase: string
  access_status: 'read' | 'partial' | 'blocked' | 'unavailable'
  claim_ids: string[]
}
type TeamAudit = {
  visible_builder_count: number | null
  supported_total_upper_bound: number | null
  upper_bound_claim_id: string | null
  coverage: 'explicit_whole_team' | 'partial_public_roster' | 'unknown'
  software_people: Array<{ person_id: string; delivery_role: string; evidence_ids: string[] }>
  contractor_capacity: 'present' | 'absent_explicitly' | 'unknown'
  assigned_delivery_provider: 'present' | 'absent_explicitly' | 'unknown'
  audited_at: string | null
}
type Qualification = {
  rule_version: string
  evaluated_at: string
  gates: Record<string, { result: 'pass' | 'hold' | 'fail'; claim_ids: string[]; reason: string }>
  eligibility: 'fit_confirmed' | 'hold' | 'out_of_scope'
  commercial_priority: 'A' | 'B' | 'research' | null
  dimension_results: Array<{ rule_id: string; score: number; claim_ids: string[] }>
  total: number | null
  blocking_gaps: string[]
  next_research_action: string | null
}
```

Also add `initiative.id`, precise proposed core functionality, artifacts and their actual functionality, launch-check results, and the build's authority claim. A negative app-store/search check records where and when the researcher looked; it cannot itself become `core_product_status: unbuilt`.

Resource links should carry `{ resource_id, relationship: discovered_via | corroborated_by | contradiction_found_via, evidence_ids, discovered_at, research_pass_id }`. Record source-pass effort, raw discoveries, deduplicated candidates, fit-confirmed leads, A/B leads and rejection reasons. Compute attributed discovery yield separately from assisted/corroboration yield and use v2 eligibility. Preserve old yields as v1 history. No automatic assignment by worker name or evidence-page equality.

## High-value acceptance tests for a v2 implementation

1. A live core app fails product eligibility even with zero employees, recent funding and a maximum numeric commercial score; STOQA's recorded example is an explicit regression fixture.
2. Zero visible engineers with incomplete coverage remains hold; a supported complete two-builder roster passes; a third confirmed builder fails.
3. An already contracted build agency prevents a delivery-gap pass even with zero internal engineers.
4. A paid-product brief plus a design prototype can pass the unbuilt gate; a functional private alpha cannot pass merely because it is private.
5. An equity-only cofounder search gives no paid-delivery points; mentorship and prize participation give no cash-budget points; unknown budget remains null/unknown and is not silently converted to cash availability.
6. Unrelated or empty evidence references cannot support gates or positive scores. Conflicting launch/team evidence blocks eligibility until resolved.
7. Company website, founder LinkedIn and company-controlled app-store copy count as one control group; syndicated press releases count as one information origin. Two genuinely independent publishers may share the same source kind.
8. Reading a 2025 cohort page today cannot create a 2026 build trigger. Invalid calendar dates, future observations, or missing event dates cannot score recency. Date-range precision uses a conservative bound.
9. A generic program homepage cannot establish a named person's cohort participation, cash award or software-team ceiling.
10. A 7-lead high-quality pilot is valid without 50 rows or exact lane quotas. Existing software firms stay excluded irrespective of remaining quota.
11. Status changes cannot manually confer calculated eligibility. Changing a lead to out-of-scope updates active counts and current source yield without erasing historical discovery attribution.
12. A newer reviewed contradiction supersedes an older promotion; deduplication merges compatible evidence and preserves conflicts rather than selecting the highest-scored snapshot.

## Migration recommendation

Preserve the current v1 snapshot. Make all current rows “awaiting v2 review” at the v2 layer, then triage them with exact gate reasons. Prioritize currently non-live/unknown rows for research, while checking their evidence because labels have already lost material facts. Publish a small reviewed pilot immediately once valid; expand only after the user can inspect representative fit decisions. The acceptance target should be zero unsupported active qualifications, not an exact count of 50.
