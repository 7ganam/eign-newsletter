# EIGN lead research pipeline

Status: operating guide for AI agents  
Version: `lead-research-pipeline.v1`  
Last reconciled with Notion: 2026-09-07

## Authority and scope

The canonical, editable guide is the Notion [Lead research operating guide](https://app.notion.com/p/3d4d460a15cb81ad844fef2a173b17c6) under the `leads` hub. The live Notion databases and live page properties are the source of truth. This file is a repository entry point and readable snapshot; if it conflicts with Notion, follow Notion and update this snapshot only when asked.

Local JSON under `assets/lead-research/` is legacy context for now. Do not read from it as authoritative, write to it, sync it, or use it to overwrite Notion unless the user explicitly restores that workflow.

All work is **RESEARCH ONLY · NO OUTREACH**. Research permission does not authorize messages, connection requests, likes, follows, form submissions, calls, private-contact collection, or changes to contact/follow-up fields.

Use the native Notion connector. Never use browser automation to edit Notion.

## Canonical Notion destinations

- Hub: [leads](https://app.notion.com/p/3d2d460a15cb80e68f00e96723f10ca8)
- Operating guide: [Lead research operating guide](https://app.notion.com/p/3d4d460a15cb81ad844fef2a173b17c6)
- Leads database: [eignspaces - leads](https://app.notion.com/p/c250c0fd564445ac9ffa5db49fa98188)
- Leads data source: `collection://28107d99-e759-4637-a630-bd11f3be950f`
- Strategies database: [Lead research strategies](https://app.notion.com/p/3abc363ca4bc4c82bc88ef870b1c1e81)
- Strategies data source: `collection://c57acc70-c1b3-40e5-9f1c-d8777149dfb3`

IDs are lookup hints, not a frozen schema. Fetch both databases before every run and use the returned live property names and types.

## Research pipeline

`Persona fit` is the research pipeline state. `Contact status` is a separate outreach/history state.

1. **Discover** — start from one active Strategy and retain the exact source that introduced the person–venture pair.
2. **Needs verification** — create a lead only when identity, Saudi relevance, authority, and a specific plausible software need have evidence, but one or more decisive gates remain unknown.
3. **Confirmed fit** — use only when every hard gate below is supported and a near-term paid build is plausible.
4. **Not a fit** — use when evidence establishes a hard disqualifier. Do not create obvious rejects merely to fill the database; record rejected-pattern counts and lessons in the Strategy run log.
5. **Legacy / not reviewed** — backlog state for older records only. Never assign it to a new lead.

The contact pipeline is outside a normal research run. Preserve `Contact status`, `Follow up on`, and `Follow-up notes` unless the user explicitly authorizes outreach operations.

## Target persona and hard gates

The target is a Saudi-market decision-maker who plausibly needs a specific core software product built before an established internal engineering team exists.

A **Confirmed fit** requires all of the following:

- Exact person and current organization are verified without an unresolved identity collision.
- Saudi-market relevance is evidenced through residence, headquarters, operations, customers, cohort, launch, or explicit expansion.
- The person currently has founder, co-founder, owner, CEO, product owner, or equivalent buying authority.
- A specific mobile app, platform, marketplace, MVP, workflow system, or custom-software need is evidenced.
- The relevant core product is not fully shipped. A landing page, prototype, waitlist, or “coming soon” page does not prove that a private product is unbuilt.
- There is no established engineering team and no more than two actual current software builders, including technical founders and relevant contractors. An incomplete visible roster leaves the maximum unknown.
- There is a current trigger and a plausible paid buying window: explicit vendor request, awarded money, paid pilot, customer contract, approved budget, implementation milestone, or dated launch/demo deadline.

Unknown facts stay unknown. Program participation, prestige, eligible funding, profile silence, or a high score cannot substitute for a missing gate. Reject the common false positive: a founder whose core app is already shipped and whose company already has an established software team.

## Strategies to use

Choose one active Strategy per run. Prefer the highest-priority strategy whose `Next review` is due or oldest.

### LinkedIn • Manual intent signals

Use for explicit, recent, buyer-authored posts asking for a developer, MVP, app, platform, vendor, technical partner, pilot, rebuild, integration, delivery scope, budget, or deadline. Start with the post, then verify exact identity, company, product state, team capacity, Saudi relevance, and paid intent.

This is the highest-signal path because the buyer states a need. Do not treat generic founder content, likes, inspirational posts, or hiring alone as buying intent.

### Accelerators & incubators • Pre-build cohort-first

Use for current idea-to-MVP cohorts, incubators, prototype programs, and early accelerator windows. Start with the official program/cohort source, harvest named founder–venture pairs, and use LinkedIn only for exact verification and recent product/team evidence.

Prioritize programs with current named cohorts, an active build milestone, first-party evidence, and plausible funds or customer access. Deprioritize mature scale-up programs and post-demo-day companies. Admission is not cash, outsourcing intent, or proof of an unbuilt product.

### Archived strategies

Archived strategies preserve provenance and lessons. Do not assign new leads to them or run them again. If an archived method becomes useful, create a new versioned Strategy rather than silently reactivating or rewriting history.

## Daily run procedure

1. Fetch the live Leads and Strategies schemas, the active-strategies view, and the chosen Strategy page. Check for user edits and discussions.
2. Select one due active Strategy. Review its connected `Needs verification` leads before collecting more names; closing decisive gaps has priority over volume.
3. Run a bounded pass. Default when the user gives no quota: 30–45 minutes, up to 10 raw person–venture pairs, and no more than 5 new Notion leads. Quality wins over count.
4. Preserve discovery provenance for every candidate: exact URL, source title/publisher, claim, source type, publication date and basis, observation date, confidence, and limitations.
5. Deduplicate before deeper research and again immediately before creation:
   - exact `Lead ID` first;
   - canonical LinkedIn URL second;
   - normalized person name plus current company third;
   - keep uncertain identities separate and document the collision.
6. Reject obvious false positives before creating a lead. For a viable but incomplete candidate, set `Persona fit` to `Needs verification`; never inflate uncertainty to `Confirmed fit`.
7. Re-fetch the Leads schema and duplicate key immediately before writing. Create the page with `$eign-notion-lead-pages`, its links-first template, the live properties, and the actual Strategy relation.
8. Re-fetch every created or changed page. Verify links, evidence count, dates, properties, Strategy relation, no duplicate, and no unauthorized contact change.
9. Update the Strategy after the pass: `Latest run`, `Next review`, `Runs`, latest-run counters, connected leads, notes, and the page-body run log. Record what worked, what failed, exclusions, decisive gaps, and next queries.
10. Finish with a concise report: strategy, sources/searches inspected, raw candidates, duplicates, rejected/held counts, new leads, confirmed fits, updated leads, unresolved gaps, and exact Notion links.

## Leads database fields

| Field | Nature and rule |
| --- | --- |
| `Lead` | Person’s verified display name. Title field. Do not prepend an emoji. |
| `Lead ID` | Required stable unique slug, normally `lead-<company-or-project>-<person>`. Never recycle an ID. Query it before creating. |
| `Strategy` | Required relation to the single original discovery Strategy. Keep historical provenance even if another strategy later verifies the lead. |
| `Discovered` | Required original discovery date. Never replace it with a later import or review date. |
| `Last researched` | Required date of the latest substantive evidence review. Viewing a page without reviewing evidence is not research. |
| `Persona fit` | Research state: `Needs verification`, `Confirmed fit`, `Not a fit`, or legacy backlog. New leads default to `Needs verification` unless every hard gate is proven. |
| `Software fit` | Strength of evidence for a relevant custom-software need: `Confirmed`, `Probable`, `Unknown`, or `Rejected`. This is not the overall qualification. |
| `Lead type` | Closest current category: `New founder`, `Stealth / pre-company`, or `SME digital build`. |
| `Why here` | Multi-select of evidence-backed trigger signals. Select only claims actually supported by evidence. |
| `Primary evidence` | Check only when at least one first-party, official, buyer-authored, or otherwise primary source anchors the candidate. |
| `Evidence count` | Number of distinct evidence records in the page’s “What introduced this lead” section. Do not count extra profile/resource/navigation links. |
| `LinkedIn` | Canonical verified person profile URL. Missing is allowed only when identity is otherwise strong and the gap is explicit. |
| `Company` | Current company or venture name as plain text. Do not store Markdown in this field. |
| `Company website` | Verified first-party company/product URL. |
| `Company LinkedIn` | Verified canonical company LinkedIn URL. |
| `Observed behaviour` | Short factual synthesis of the evidenced action or trigger, with no guessed intent. |
| `Contact status` | Factual outreach state. For a genuinely new research-only lead use `Not contacted`; do not use `to-be-contacted` as an instruction to act. Preserve existing values. |
| `Follow up on` | Outreach follow-up date only, not a research review date. Leave empty during research-only work. |
| `Follow-up notes` | Factual outreach history only. Never invent “no contact” or overwrite user notes. |
| `Newsletter person` | Relation to the people database only after conservative identity matching: canonical LinkedIn first, then normalized name plus organization. Preserve existing relations. |
| `Freshness` | Read-only formula. Never write to it. |

The lead page body must follow the repository’s `eign-notion-lead-pages` skill: blue profile callout, Links first, why included, quick assessment, one specific research next step, complete evidence records, lead details, and research metadata. Preserve publication-date uncertainty and user edits.

## Strategies database fields

| Field | Nature and rule |
| --- | --- |
| `Strategy` | Clear source plus method name, for example `LinkedIn • Manual intent signals`. |
| `Strategy ID` | Required stable versioned slug such as `linkedin-intent-first-v1`. Query before creating. |
| `Version` | Integer revision of this strategy definition. Material method changes create a new version/record. |
| `Status` | `Active`, `Paused`, or `Archived`. Only Active strategies may generate new leads. |
| `Priority` | `High`, `Medium`, or `Low`; used with `Next review` to choose daily work. |
| `Cadence` | `Twice weekly`, `Weekly`, `Monthly`, or `Ad hoc`. |
| `Objective` | One measurable sentence describing where candidates come from and what must be verified. |
| `Persona` | Strategy-specific persona and decisive exclusions, consistent with the global hard gates. |
| `Created` | Original creation timestamp. |
| `Updated` | Last material strategy-definition update, not every run. |
| `Latest run` | Date of the latest completed run. |
| `Next review` | Next date this strategy should be run or evaluated. |
| `Runs` | Lifetime count of completed, logged runs. |
| `Queries`, `Search passes`, `Post impressions` | Measurement for the latest completed run. Use 0 only when measured zero; leave unknown metrics empty. |
| `New candidates`, `Carried candidates`, `Confirmed fits` | Latest completed run results. Define carried candidates as existing leads substantively re-reviewed. |
| `Connected leads` | Cumulative relation to leads originally discovered by this strategy. Do not remove historical relations when archiving. |
| `Notes` | Short current summary and limitations. Detailed run history belongs in the page body. |

## Creating a new strategy

Create a strategy only when it has a distinct starting source or harvesting method. A new query variation belongs in an existing strategy; a different discovery channel, access mode, target window, or qualification hypothesis may justify a new one.

1. Search the Strategies database by `Strategy ID`, title, and similar objective. Extend an existing strategy when the difference is only a query variant.
2. Write a falsifiable hypothesis: source population, expected signal, target persona, and why this method may surface buyers before they build internally.
3. Define source/access boundaries and prohibited actions. Default to public or ordinary signed-in read-only research; no outreach or private data.
4. Define inclusion gates, exclusions, freshness window, deduplication rules, evidence requirements, and the exact relation rule for created leads.
5. Add proven queries/sources, low-yield patterns, workflow steps, measurement definitions, and a small first-run quota.
6. Create the Notion Strategy with a unique versioned ID, `Active` or `Paused` status, priority, cadence, dates, objective, and persona.
7. In the page body include: one-line rule; source map; workflow; hard gates; evidence/date rules; search patterns; run log; what worked; what failed; risks; improvements; and next queries.
8. Run a bounded pilot. Do not claim the strategy works from candidate volume alone. Evaluate duplicate rate, percentage reaching `Needs verification`, confirmed-fit yield, evidence quality, and time per useful candidate.
9. Iterate by updating queries and notes. For a material change in source or qualification logic, archive the old record and create the next version so old leads retain correct provenance.

## Completion and safety checks

- Notion was fetched before work and immediately before writes.
- Each new lead has a unique Lead ID, a Strategy relation, original discovery date, latest research date, and at least one preserved source.
- Identity uses LinkedIn first, then normalized name plus organization; uncertain matches remain separate.
- Every scored or qualifying claim maps to evidence. Unknown is not zero or false.
- Publication date and observation date remain separate; derived dates are labelled derived and living pages may be undated.
- No obvious shipped-app/established-team false positive was promoted.
- No contact/follow-up property, message, or external account was changed.
- Created/updated pages were fetched again and checked for exact properties, content structure, evidence, relations, and duplicates.
- The Strategy run log and latest-run metrics were updated so tomorrow’s agent can continue without reconstructing today’s work.
