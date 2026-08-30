# YC to Crunchbase research and scraping handoff

This is the canonical context file for the YC/Crunchbase work in this repository. A future AI agent should read this file before touching the related scripts or data.

- Snapshot date: 2026-08-30
- Workspace: `/Users/ahmedelghannam/projects/playground/eign-newsletter`
- Baseline Git state before this handoff: branch `main`, commit `8d90591`, clean working tree
- Canonical data run: `outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z`

## Resume instructions for another AI agent

1. Read this file and `outputs/yc-crunchbase-links-public/README.md` first.
2. Inspect the current working tree and the canonical run before assuming this snapshot is still current.
3. Do not open Crunchbase, use the logged-in Edge session, run a live Crunchbase request, export data, reveal contacts, inspect cookies/profile data, or use an API unless the user explicitly approves that specific account-sensitive action first.
4. The user has no Crunchbase API key and wants a UI/public-source solution. Do not propose the API as the default path.
5. Prefer safe local analysis and public evidence that does not touch Crunchbase account allowances.
6. Do not describe the existing link dataset as complete, production-ready, or at least 95% accurate. It is not.
7. Keep uncertain identities unresolved. Never convert a company name or inferred slug into a trusted Crunchbase link without identity evidence.
8. Preserve source provenance, validation notes, timestamps, and unresolved cases in every derived dataset.

## Current outcome in one paragraph

The repository contains a tested macOS/Edge organization-page scraper, an offline extractor that turns the raw payload into clean company insights, and a zero-Crunchbase public-source pipeline that generated candidate Crunchbase links for a 6,302-row union YC roster. The Axiom Biosciences scrape and insights output worked. The broad YC link audit did not meet the user's 95% accuracy target: 3,653 rows are classified as risky, and a risky-only random audit estimated that 37.7% of that risky population is wrong under a stated unresolved-at-random assumption. The 2,649-row lower-risk partition passed a 15-row smoke test, but that sample is far too small to certify 95% accuracy. A genuinely high-accuracy final link file has not been produced yet.

## User objectives and conversation history

The user asked for the following, in this order:

1. Create a script that opens a Crunchbase organization page, initially `https://www.crunchbase.com/organization/axiom-biosciences`, and extracts its data as JSON. Use the existing logged-in Microsoft Edge session if needed, test it, and confirm it works.
2. Produce a second file from the raw scrape containing meaningful company information and insights, without UI data or internal IDs.
3. Obtain Crunchbase links or organization slugs for all YC-funded companies so those links can later be passed to the scraper.
4. Do not consume any Crunchbase account data allowance. Ask before any action that might use an allowance.
5. Do not use a Crunchbase API key; none is available. The requested extraction path is the web UI/public evidence.
6. Find a solution that can build the link inventory without using the account's limits.
7. Identify the single file containing the broadest dataset and assess whether `yc-crunchbase-audit.csv` is complete.
8. Validate representative samples, count conflicts/risk rows, sample unverified rows, separate risky from lower-risk categories, and test the lower-risk partition.
9. Improve the data to at least 95% accuracy.
10. Statistically estimate the probability that a link is wrong in the risky set only, excluding lower-risk rows.
11. Save the full working context in the repository so another AI agent can resume safely.

## Non-negotiable account and privacy boundary

Treat every authenticated Crunchbase page load as potentially account-sensitive, even if no explicit quota counter is visible.

Without fresh, explicit user approval, do not:

- run `pnpm scrape:crunchbase ...`;
- open Crunchbase in the user's logged-in Edge session;
- bulk-open candidate links;
- export a Crunchbase list or profile;
- reveal a contact;
- save, track, tag, edit, message, or change Crunchbase settings;
- inspect, copy, persist, or transmit cookies, browser profiles, local storage, credentials, tokens, or account data;
- run the live API mode in `scripts/export-yc-crunchbase-links.ts`;
- use any API, bulk-data, export-row, page-view, or contact allowance.

The previous public-source export recorded zero Crunchbase requests, no browser use, no cookies or profile reads, and no API-key reads. That is an attestation about the recorded run in `manifest.json`, not a permanent guarantee about future code or commands.

The authenticated scraper exists and was proven experimentally, but the official [Crunchbase Terms of Service](https://www.crunchbase.com/terms-of-service) reviewed on 2026-08-28 prohibited crawling/scraping and automated export. Recheck the current terms before relying on this statement, and do not turn the scraper into a bulk production workflow without an appropriate permission or licensed route, in addition to the user's explicit approval.

No credentials, cookies, tokens, API keys, or browser-profile data are stored in this handoff.

## What has been implemented

### 1. Authenticated organization-page scraper

- Source: `scripts/scrape-crunchbase.ts`
- Package command: `pnpm scrape:crunchbase`

Behavior:

- accepts only `https://www.crunchbase.com/organization/<slug>` URLs;
- creates a temporary tab in the currently running Microsoft Edge session on macOS;
- reads the rendered `script#ng-state[type="application/json"]` payload through Edge Apple Events JavaScript;
- requires the page state to report a logged-in session;
- selects the successful organization response whose permalink exactly matches the requested slug;
- rejects missing, wrong, unauthenticated, or cardless payloads;
- exports only the matched organization response, not the full page state containing account/session data;
- writes both the raw JSON and a sibling `.insights.json` file;
- normally closes its temporary tab and restores the prior Edge tab.

Direct anonymous HTTP and Playwright attempts received Cloudflare 403 responses. The existing Edge process was not CDP-attachable, so Apple Events JavaScript was used instead. The script does not read cookies, Edge profile files, local storage, or credentials.

This command is account-sensitive and must not be run again without explicit user approval:

```sh
pnpm scrape:crunchbase https://www.crunchbase.com/organization/<slug>
```

### 2. Clean company-insights extractor

Sources:

- `scripts/extract-crunchbase-insights.ts`
- `scripts/lib/crunchbase-insights.ts`

Package command: `pnpm extract:crunchbase-insights`

This is an offline transformation of an existing raw scrape. It uses an allowlist of company-facing fields, performs deterministic calculations, and rejects output containing internal IDs or account/session data.

Top-level output keys:

- `schemaVersion`
- `generatedAt`
- `source`
- `methodology`
- `dataQuality`
- `facts`
- `derivedMetrics`
- `providerSignals`
- `insights`

The `facts` section currently contains company details, products/services, funding, and recent news. The extractor intentionally omits UI cards/layout fields, UUIDs, entity wrappers, image references, browser/session/account metadata, email, phone, and weak provider fields called out in `dataQuality.intentionallyOmitted`.

The insights are deterministic interpretations of the captured Crunchbase payload. They do not independently verify Crunchbase data or add outside facts.

### 3. Public-source YC to Crunchbase link exporter

Sources:

- `scripts/export-yc-crunchbase-links-public.ts`
- `scripts/lib/public-yc-crunchbase-links.ts`
- `scripts/lib/public-yc-crunchbase-links.test.ts`
- `outputs/yc-crunchbase-links-public/README.md`

Package command: `pnpm export:yc-crunchbase-links:public`

The default command uses snapshots already on disk and does not access the network. `--refresh-sources` is restricted to the public allowlist `huggingface.co`, `raw.githubusercontent.com`, and `yc-oss.github.io`; Crunchbase is not allowed. A refresh changes the source snapshot and should create a new run rather than silently redefining the 2026-08-28 audit.

The canonical run used:

- a current public YC roster mirror;
- DataHive's public YC dataset;
- the public `radema/yc-scraper` snapshot;
- a historical Kaggle startup snapshot;
- a locally derived Common Crawl organization-URL dictionary for historical observation only.

Wikidata property P2088 was considered as a possible high-confidence public identifier source, but its coverage is not sufficient for all YC companies, especially recent cohorts. It is not a complete solution by itself.

### 4. Risk separation and risky-only statistical audit

Sources:

- `scripts/categorize-yc-crunchbase-audit.ts`
- `scripts/create-risky-link-audit-sample.ts`
- `scripts/analyze-risky-link-error-sample.ts`

Package commands:

- `pnpm categorize:yc-crunchbase-audit`
- `pnpm sample:yc-crunchbase-risky`
- `pnpm analyze:yc-crunchbase-risky`

The categorizer creates risky and lower-risk partitions plus one file per overlapping risk category. The sampler freezes a deterministic simple random sample without replacement using SHA-256 ordering. The analyzer verifies the four review batches against the frozen sample and produces CSV, JSON, and Markdown results with Wilson intervals.

## Verified Axiom Biosciences example

- Raw output: `outputs/crunchbase/axiom-biosciences.json`
- Clean output: `outputs/crunchbase/axiom-biosciences.insights.json`

The live run completed on 2026-08-28 and confirmed:

- expected organization permalink: `axiom-biosciences`;
- authenticated Edge capture;
- 101 organization data cards;
- raw output size of approximately 433 KiB;
- reported total funding of USD 20,943,095;
- 11 reported funding rounds, with 10 detailed rows embedded;
- 10 named investors;
- eight generated insight items in the clean output.

The clean file records data-quality caveats, including the mismatch between reported and detailed round counts and USD 325,000 of reported funding not attributable to the detailed disclosed amounts. It should be used for company research; the raw file should be retained for traceability, not treated as a clean business-data schema.

## Canonical YC/Crunchbase run and file semantics

Canonical run directory:

`outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z`

The scope is a 6,302-company union roster: the 6,194-row current public YC mirror plus 109 historical-only companies, excluding the YC directory self-entry. This is not the same as 6,302 currently active companies.

| File | Meaning | Safe interpretation |
| --- | --- | --- |
| `manifest.json` | Provenance, source hashes/licenses, output definitions, counts, and network-safety record | Start here when auditing how the run was built |
| `yc-crunchbase-audit.csv` | One candidate row for each of 6,302 union-roster companies | Broadest company-level audit, but not verified truth |
| `yc-crunchbase-links.txt` / `.json` | 2,907 unique URLs explicitly present in public YC-specific sources | Link inventory only; not one current canonical URL per company and not live-checked |
| `yc-crunchbase-all-candidates.txt` / `.json` | 6,422 unique URLs combining public URLs and inferred candidates | Broad scraper inputs; unsafe as a trusted dataset |
| `yc-crunchbase-candidates.csv` | Inferred candidate details | Candidate-generation evidence, not validation |
| `yc-crunchbase-public-evidence.csv` | Every public-source row behind the conservative link inventory | Provenance/supporting evidence |
| `yc-crunchbase-source-conflicts.csv` | Public sources that disagree | Must be resolved, not arbitrarily selected |
| `yc-crunchbase-manual-validation.csv` | Thirty manually reviewed rows: 28 confirmed, 2 incorrect | Small labeled evidence set, not a dataset-wide accuracy proof |
| `yc-companies-without-candidate.csv` | Companies without any candidate | Empty in this run, which reflects inference coverage rather than correctness |

The 2,907 publicly sourced URLs include historical or alternate links, source conflicts, and 160 source-only URLs that could not be mapped to the union roster. None was live-checked against Crunchbase during generation.

The answer to “what single file has it all?” is therefore nuanced:

- `yc-crunchbase-audit.csv` has the broadest one-row-per-company audit context and is the best file for continued reconciliation.
- It is not a final, complete, 95%-accurate link list.
- A new final verified file still needs to be created after correction and validation.

## Risk partition

Directory:

`outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation`

Counts:

- total audit rows: 6,302;
- risky unique rows: 3,653;
- lower-risk rows: 2,649.

The lower-risk definition is: a full Crunchbase URL from a public source, mapped to the current roster, with a syntactically usable company-website value, and no source conflict, URL collision, invalid source value, historical-only flag, slug-only evidence, or observed validation failure/unresolved result. “Usable” here is only a format check: nonempty, no comma, parseable as a URL, and a hostname containing a dot. It does not prove that the website belongs to the YC company or matches the Crunchbase candidate.

Risk categories and counts:

| Category | Rows | Meaning |
| --- | ---: | --- |
| `unverified_candidate` | 3,533 | URL inferred rather than supported by a full public-source URL |
| `archive_observed_candidate` | 19 | Exact slug was historically observed in Common Crawl, which does not prove identity or current validity |
| `source_conflict` | 8 | Public sources disagree about the URL |
| `url_collision` | 12 | One URL maps to more than one YC ID |
| `invalid_source_value` | 9 | A source supplied a malformed or unusable value |
| `historical_only` | 109 | Company is outside the current public mirror but present in historical sources |
| `invalid_company_website` | 38 | YC/company website is absent or unusable as an identity anchor |
| `slug_only_source` | 3 | Public source supplied only a slug rather than a full URL |
| `sample_validation_failed` | 2 | A manually sampled candidate was confirmed incorrect |
| `sample_validation_unresolved` | 0 | No row in the initial manual-validation file had this label |

Categories overlap. Never sum category counts to obtain the number of risky rows.

Critical state detail: these partitions and category counts predate the fresh 100-row risky audit. The `sample_validation_failed` and `sample_validation_unresolved` counts above reflect only `yc-crunchbase-manual-validation.csv`. The later 53 correct, 32 wrong, and 15 unresolved labels exist only in `risk-separation/risky-link-error-audit/risky-link-random-sample-validated.csv`; they have not been merged into `yc-crunchbase-risky.csv`, `yc-crunchbase-manual-validation.csv`, or the per-category files. Any new verified dataset must merge all 100 labels by `yc_id`. Do not interpret the two `sample_validation_failed` rows as the total number of known wrong rows after the fresh audit.

Important files:

- `yc-crunchbase-risky.csv`: all 3,653 risky rows;
- `yc-crunchbase-non-risky.csv`: all 2,649 lower-risk rows;
- `yc-crunchbase-non-risky-links.txt`: lower-risk link list;
- `yc-crunchbase-risk-summary.json`: definitions and counts;
- `risky-categories/*.csv`: one overlapping category per file;
- `yc-crunchbase-non-risky-sample-validation.csv`: the lower-risk smoke-test labels;
- `yc-crunchbase-non-risky-sample-summary.json`: smoke-test design and interpretation.

## Validation rubric

Use this rubric consistently for every mapping:

- `correct`: the candidate Crunchbase result contains the exact registrable company website domain, or multiple strong identity anchors such as matching founders, product, YC batch, aliases, acquisition, or rebrand history.
- `wrong`: the candidate clearly belongs to a different entity, or strong public evidence establishes a different canonical Crunchbase organization URL.
- `unresolved`: public evidence is insufficient or conflicting. Preserve this status; do not force a binary label.

Name similarity, slug similarity, search-result existence, or an HTTP page existing is not enough by itself. Generic slugs frequently collide with unrelated companies.

Direct anonymous runtime checks were blocked by Cloudflare. Consequently, the labels are strict canonical-identity judgments and do not prove whether a generic proposed URL might redirect when opened in a real browser.

Evidence and label limitations:

- public evidence URLs and snippets can drift;
- most labels were not independently double-reviewed;
- no inter-rater reliability statistic was calculated;
- frozen screenshots/page snapshots were not retained for all labels;
- statistical intervals cover sampling uncertainty, not research or labeling error.

## Manual validation before the risky random sample

`yc-crunchbase-manual-validation.csv` combines two 15-row phases. The first representative sample produced 13 confirmed and two incorrect rows; the later lower-risk smoke sample produced 15 confirmed and no incorrect rows. The aggregate is 28 confirmed and two incorrect.

Exactly four of those rows are in the risky population and form the stratum called `knownCertaintyRows` by the analyzer. The estimator treats their labels as fixed/exact, but they were not independently double-reviewed, so the general label-error caveat still applies:

| Company | Proposed result | Label | Corrected result |
| --- | --- | --- | --- |
| Vahan | `/organization/vahan` | wrong | `/organization/vanan-services` |
| Halluminate | `/organization/halluminate` | wrong | `/organization/halluminates` |
| JITX | `/organization/jitx` | correct | same URL |
| Mono | `/organization/mono` | correct | same URL |

## Lower-risk smoke test

The lower-risk population contains 2,649 rows. A deterministic stratified sample of 15 previously unreviewed rows covered source, YC status, and company age. Results were 15 confirmed, zero incorrect, and zero unresolved.

This is encouraging but is only a smoke test. With 15 observations and no observed errors, the approximate rule-of-three 95% upper bound on the underlying error rate is about 20%. Therefore:

- do not claim the lower-risk partition is 100% accurate;
- do not claim it has demonstrated at least 95% accuracy;
- run a properly powered independent holdout audit before certification.

## Risky-only statistical audit

Directory:

`outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/risky-link-error-audit`

Design:

- scope: risky rows only; lower-risk rows excluded;
- risky population: 3,653;
- estimator-fixed stratum (`knownCertaintyRows` in the output): four previously reviewed risky rows, two correct and two wrong;
- unreviewed sampling frame: 3,649;
- fresh sample size: 100 unique YC IDs;
- method: simple random sample without replacement using SHA-256 ordering;
- seed: `risky-link-error-audit-2026-08-28-v1`;
- fresh labels: 53 correct, 32 wrong, 15 unresolved.

Result:

- central risky-population wrong-link prevalence estimate: 37.6606%, approximately 1,376 of 3,653 rows;
- central assumption: unresolved rows have the same wrong-link rate as resolved rows;
- conditional 95% Wilson interval: 28.1163% to 48.2720%, approximately 1,027 to 1,763 rows;
- if every unresolved sample row is correct: point estimate 32.0197%, approximately 1,170 rows;
- if every unresolved sample row is wrong: point estimate 47.0033%, approximately 1,717 rows;
- combined sampling and unresolved-classification envelope: 23.6980% to 56.7038%.

Interpretation:

- 37.7% is a prevalence estimate for the risky population under its stated assumption, not the literal probability for every individual risky row;
- it says nothing directly about the 2,649 lower-risk rows;
- unresolved cases may be systematically harder and more error-prone, so the central interval does not capture all model risk;
- the conservative envelope handles the sample's unresolved classification extremes but still does not include research/labeling mistakes;
- the finite-population correction was intentionally omitted, making the intervals slightly conservative.

All 100 randomly sampled rows carried only the dominant `unverified_candidate` flag. The unreviewed frame has 192 rows with at least one other risk flag. Under the uniform-random/SHA-256-as-random simple-random-sample model, the chance of selecting zero of those 192 rows was approximately 0.416%. This unusual realization does not invalidate the global simple random sample, but it means no category-specific error rate can be inferred. Rare risk categories need separate targeted or stratified audits.

Audit files:

- `risky-link-random-sample.csv`: frozen unlabeled sample;
- `sample-design.json`: population, seed, and category counts;
- `validation-batch-1.csv` through `validation-batch-4.csv`: review work;
- `risky-link-random-sample-validated.csv`: merged labeled sample;
- `risky-link-error-analysis.json`: canonical machine-readable result;
- `risky-link-error-analysis.md`: concise human report.

Sample batch summary:

| Batch | Correct | Wrong | Unresolved |
| --- | ---: | ---: | ---: |
| 1 | 13 | 7 | 5 |
| 2 | 16 | 7 | 2 |
| 3 | 13 | 7 | 5 |
| 4 | 11 | 11 | 3 |
| Total | 53 | 32 | 15 |

Wrong labels by batch:

- Batch 1: Refactor, Dinesafe, Symphony, Studio, Ploy, Crimson, Corsair.
- Batch 2: Nobell Foods, Nixo, Zettascale, Lightdash, Stage, Telmai, Lantern.
- Batch 3: Stackup, Mojo, xPay, Robby, Scout, Lucid, CashBook.
- Batch 4: Dexter, Wingman, Capy, Cerenovus, Panels, Gojiberry AI, Dodo, Clew, Atlog, Hilos, Membo.

Unresolved labels by batch:

- Batch 1: Coco Controller, Entry, OpenVector, Foreman, Vista Power.
- Batch 2: Charm, Request Network.
- Batch 3: PlayReader, Luca IQ, Yoneda Labs, Praxis Robotics, LLM Stats.
- Batch 4: Synapse Semiconductor, Binks, Lattice Health.

Examples of verified corrections or identity collisions:

- Dexter: `/organization/dexter` -> `/organization/dexter-2f0f`.
- Wingman: `/organization/wingman` -> `/organization/wingman-dfb7`.
- Capy: `/organization/capy` -> `/organization/capy-ai-agents-ltd`.
- Panels: `/organization/panels` -> `/organization/panels-1f26`.
- Gojiberry AI: `/organization/gojiberry-ai` -> `/organization/gojiberryai`.
- Clew: `/organization/clew` -> `/organization/clew-0eeb`.
- Atlog: `/organization/atlog` -> `/organization/atlog-3de2`.
- Hilos: proposed `/organization/quid`; verified `/organization/hilos-a37f`.
- Membo: `/organization/membo` -> `/organization/membo-c55e`.
- Dodo: `/organization/dodo` identifies a Czech logistics company rather than the YC company at dodo.ai.
- Cerenovus: `/organization/cerenovus` identifies Johnson & Johnson's neurovascular company rather than the YC company at cerenovus.ai.

## Integrity checks

SHA-256 checksums:

- `risky-link-random-sample-validated.csv`: `59999b1cd057cb4a1e113b3c8c1f640652c203e55a6d9cce8d03d7b4a415b5c3`
- `risky-link-error-analysis.json`: `bb18cb8419ff64eba9146be356b03ada096ca3cfa15c00e1d0f910010abd0e17`

Recheck with:

```sh
shasum -a 256 \
  outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/risky-link-error-audit/risky-link-random-sample-validated.csv \
  outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/risky-link-error-audit/risky-link-error-analysis.json
```

## Commands and safety classification

### Read-only local verification commands

These commands do not access Crunchbase or overwrite the canonical artifacts:

```sh
pnpm exec tsc --noEmit
pnpm test:yc-crunchbase-links:public
pnpm test:yc-crunchbase-links
shasum -a 256 \
  outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/risky-link-error-audit/risky-link-random-sample-validated.csv \
  outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/risky-link-error-audit/risky-link-error-analysis.json
```

### Local regenerators: use a new output or copied run

These commands do not contact Crunchbase, but they write files. Do not point them at the canonical run unless intentionally reproducing it from unchanged code and inputs. `extract` overwrites its default sibling insights file; `categorize`, `sample`, and `analyze` overwrite derived files inside the supplied run directory, and doing so can invalidate the checksums recorded above.

Write a rebuilt insights file to a new path:

```sh
pnpm extract:crunchbase-insights \
  outputs/crunchbase/axiom-biosciences.json \
  -o outputs/crunchbase/axiom-biosciences.rebuilt.insights.json
```

For risk regeneration, first make a deliberate copy or a new run directory, then use that new directory:

```sh
pnpm categorize:yc-crunchbase-audit <copied-run-directory>
pnpm sample:yc-crunchbase-risky <copied-run-directory> 100 <new-seed>
pnpm analyze:yc-crunchbase-risky <copied-run-directory>
```

The public exporter is local-only when run without refresh and creates a new timestamped run:

```sh
pnpm export:yc-crunchbase-links:public
```

### Public-network refresh that does not contact Crunchbase

This contacts only the hardcoded public-source allowlist, but it can create a different source snapshot:

```sh
pnpm export:yc-crunchbase-links:public --refresh-sources
```

Before running it, inspect the allowlist in the current code and preserve the old run. Do not assume a future edit still has zero Crunchbase access.

### Account-sensitive command: ask the user first

```sh
pnpm scrape:crunchbase https://www.crunchbase.com/organization/<slug>
```

It opens a logged-in Crunchbase page in Edge. Do not run it, even for one company, without fresh explicit approval.

### Live API command: incompatible with the present requirement

`scripts/export-yc-crunchbase-links.ts` is a legacy API implementation. Its default mode is a zero-network dry run, but this form makes metered live requests and must not be used under the current constraint:

```sh
pnpm export:yc-crunchbase-links --execute --max-requests <n>
```

The user has no API key and does not want API or account-limit usage.

## Why the current data is not at least 95% accurate

The broad audit maximized candidate coverage, not verified precision. It inferred many Crunchbase slugs directly from YC slugs or company names. Generic names collide, companies rebrand, and Crunchbase often uses suffixes or legacy names. Public-source URLs can also be stale, conflicting, or historical.

Current evidence is insufficient for a 95% claim:

- the risky set has a high estimated error prevalence;
- the lower-risk sample is too small to certify its population;
- public-source URLs were not live-validated at generation time;
- label error and evidence drift were not quantified;
- rare risk categories were not represented in the global risky sample.

There is an unavoidable precision/coverage tradeoff under the zero-Crunchbase-account constraint. A high-precision file can be built by excluding unresolved rows; a complete all-company file with at least 95% accuracy will require substantial row-level public verification and may still leave some companies unresolved. Do not claim both full coverage and 95% accuracy until the evidence supports both separately.

## Recommended path to a genuinely high-accuracy final file

### 1. Define the final schema and scope

Create a new derived file rather than overwriting the canonical audit. Suggested final filename:

`outputs/yc-crunchbase-links-verified/yc-crunchbase-links-verified.csv`

Recommended fields:

- `yc_id`
- `company_name`
- `yc_profile_url`
- `company_website`
- `proposed_crunchbase_url`
- `canonical_crunchbase_url`
- `verification_status` (`verified`, `corrected`, `unresolved`, `wrong`)
- `confidence_tier`
- `identity_anchors`
- `evidence_url_1`
- `evidence_url_2`
- `evidence_snapshot_at`
- `reviewer`
- `second_review_status`
- `notes`

Decide explicitly whether the target includes the 109 historical-only companies or only the current public YC roster. Preserve the denominator in a manifest.

### 2. Optimize precision before coverage

- Start with public full-URL rows that have exact domain or equivalent hard identity anchors.
- Apply the 30 existing manual labels and all corrections from the risky audit.
- Quarantine inferred, collided, conflicted, historical-only, invalid-website, and unresolved rows.
- Never publish an unresolved candidate as verified.
- Keep alternate/historical URLs in provenance fields rather than silently choosing one.

### 3. Resolve identities using public evidence without the account

Use multiple independent anchors where possible:

- current and historical YC company profiles;
- exact registrable company domain;
- company site and press pages;
- founder names;
- product description and market;
- batch, aliases, acquisitions, and rebrands;
- publicly indexed Crunchbase result text or public structured identifiers;
- Wikidata P2088 when available;
- archived public pages for historical identities.

Record evidence, timestamp it, and save a concise reasoning note. If hard evidence remains insufficient, label the row unresolved.

### 4. Add independent review where mistakes are costly

- Double-review every correction, conflict, collision, and ambiguous rebrand.
- Use a separate holdout sample for final accuracy measurement; do not audit only rows used to tune the rules.
- Measure reviewer disagreement and adjudicate it.
- Create targeted samples for rare risk categories because the existing simple random sample missed them.

### 5. Certify the final emitted set statistically

Accuracy should be measured only on rows actually emitted as verified/corrected. Use a reproducible random or stratified holdout audit and a one-sided confidence bound.

An illustrative minimum: under a binomial model, 59 randomly selected emitted rows, all adjudicated correct, are required for the exact one-sided 95% Clopper-Pearson lower confidence bound on accuracy to exceed 95% (`0.05^(1/59) > 0.95`). Reviewer reliability is a separate source of uncertainty. If any errors occur, if strata are reported separately, or if reviewer error is material, the required sample is larger. Calculate the final design rather than relying on this shortcut.

Acceptance criteria:

- one canonical URL per emitted YC company;
- every emitted row has hard identity evidence;
- unresolved rows are excluded from the high-confidence link file and reported separately;
- corrections and conflicts receive independent review;
- a frozen holdout audit has a one-sided 95% lower confidence bound of at least 95% accuracy;
- coverage is reported separately from accuracy;
- manifest records source versions, timestamps, row counts, exclusions, hashes, and zero-Crunchbase-account attestation;
- no logged-in Crunchbase access occurs without explicit user approval.

## Known claims to avoid

Do not say:

- “All 6,302 links are correct.”
- “The audit CSV is complete and verified.”
- “The lower-risk set is 100% accurate.”
- “The lower-risk set is already proven at least 95% accurate.”
- “A risky link has exactly a 37.7% chance of being wrong.”
- “The 37.7% estimate applies to all rows.”
- “Publicly sourced means live/current/canonical.”
- “Common Crawl observation proves company identity.”
- “A page or matching slug proves the correct company.”
- “The statistical interval includes research and labeling error.”
- “The public exporter can never contact Crunchbase.” Review current code before rerunning.

## License caution

The public-source run records uploader-declared licenses in `manifest.json`. The DataHive repository metadata says CC BY-NC 2.0 while its README text says CC BY-NC 4.0. The historical Kaggle source declares CC BY-SA 4.0, and the Radema source declares MIT. These declarations do not prove that every third-party field can be relicensed. Resolve licensing before commercial redistribution.

## Suggested copy/paste prompt for the next agent

> Read `YC_CRUNCHBASE_AI_HANDOFF.md` and inspect the current repository state. Continue the YC-to-Crunchbase identity reconciliation toward a statistically demonstrated accuracy of at least 95%. Do not open Crunchbase, use the logged-in Edge session, run an API/export/contact action, or consume any account allowance without asking me first. Preserve the canonical 2026-08-28 run, work in new derived files, keep uncertain identities unresolved, record evidence and timestamps, and report accuracy separately from coverage.

## Final state at handoff

- The Axiom scraper and clean insights transformation exist and were previously live-verified.
- The public-source YC candidate export exists and used zero Crunchbase requests in the recorded run.
- Risky and lower-risk partitions exist.
- The risky-only statistical audit is complete and reproducible.
- No 95%-certified final link file exists yet.
- The safest next task is a public-evidence verification/correction pipeline plus a properly powered final holdout audit.
