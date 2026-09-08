# Notion lead page creation rule

Version: `notion-lead-content.v1`
Verified against user-edited Notion pages on 2026-09-05.

Readable Notion copy: [Lead page creation standard](https://app.notion.com/p/3d2d460a15cb8114bac3f65ce2ff613c?pvs=204). The repository rule and template are the creation instructions; reconcile later user edits before publishing.

## Scope and precedence

Apply this rule whenever creating a new lead page or intentionally reformatting one in the **eignspaces - leads** Notion database. It governs the page body, not the qualification policy or database schema. Explicit newer user instructions and deliberate edits to an existing page take precedence.

Use the native Notion connector. Fetch the live database schema and target page before writing. Do not use computer automation for Notion. This rule does not authorize outreach, contact enrichment, database changes, or bulk reformatting of unrelated leads.

## Required page layout, in order

1. Set the page icon to 👤 for new pages; preserve a different deliberate icon on an existing page unless its replacement is requested. Do not prepend the icon to the stored Lead name.
2. One short blue 👤 callout: **Name — role at company.** Follow with a plain-language product description. Avoid repeating the company when the role already includes it. No duplicated page title or long introduction.
3. **Links**: the first H2 and first table. A native Notion table with exactly two columns: **Link** and **Description**.
   - Put each evidence source in a numbered row with a descriptive clickable title.
   - Add relevant, verified profile/company/product links, discovery resources and the linked strategy if not already represented.
   - Deduplicate identical URLs (including trailing-slash equivalents); do not collapse distinct posts, claims, publishers or pages. A repeated URL can support several evidence records, all retained in the detailed section.
   - Use concise complete descriptions; no clipped ellipses or generic “click here.” Do not invent links to fill missing fields.
4. **Why this lead is here**: brief bullets for Trigger signals, Decision authority, Saudi connection, Software fit, and Current activity. Use actual evidence and the current Why here values, not program prestige or guessed intent.
5. **Quick lead assessment**: native **Question | Answer** table covering Who is the lead?, Role, Company, Location, Product stage, Research status, Persona fit, Lead score, and Contact status.
   - Distinguish operating-business stage from the specific software product's completion state.
   - Show unknowns explicitly. Label candidate scores exploratory and not qualified; a score never overrides missing gates.
   - Read current contact status from Notion, not a stale body or an assumed default. A body snapshot must not contradict current properties.
6. **Recommended next step**: one specific, evidence-based research action addressing the decisive gap. No generic sales pitch or automatic outreach. A review date is not a scheduled automation.
7. **What introduced this lead**: one numbered subsection per evidence record, matching its source-table numbering where possible. Include:
   - Descriptive source title, original link, full paraphrased claim and important limitations.
   - Claim, source type, quality, confidence, publisher, observed date, publication date, and publication-date basis.
   - Preserve exact dates and uncertainty. Mark activity-ID dates **derived**, living pages **undated**, and a month-only date as an exact day **unknown**. Observed date never replaces published date.
   - Do not discard evidence to shorten the Links table. Count evidence records, not extra navigation/resource rows.
8. **Lead details**: Role, Current organization, Company, Product, Observed behaviour, Discovery note; include actual existing-product URLs when known.
9. **Research metadata**: subsections for Persona review, Verification gaps, Detailed fit notes, Additional discovery resources, Follow-up activity, and Technical provenance.
   - Persona review: status, core product, current software-builder minimum/maximum, and assessment.
   - Keep each dimension's score, explanation and supporting evidence associations available; distinguish unknown from zero capacity.
   - Preserve penalties, discovery strategy/relation, run/batch, discovery/research/review dates, stable lead ID, schema, source files and evidence IDs.
   - Follow-up activity must reflect recorded facts. “No activity recorded” is not proof no contact occurred. Never invent a message, channel or outcome.

Use the bundled [lead-page template](../assets/lead-page-template.md) as the structural starting point. Replace all placeholders before publishing. Notion tables and callouts use the enhanced Markdown syntax from the native connector's specification; use tabs for nested callout content.

## Truth and preservation rules

- Copy the observed **structure**, never another lead's facts, score, status, contact history or recommendation.
- The target remains an unbuilt core software product, no established engineering team and at most two actual current builders including hands-on founders and contractors. Profile silence and two visible company members do not prove this limit.
- A prototype or coming-soon page may coexist with a functional private product. Unknown completion stays unknown.
- Program participation, membership, incubation admission, prize, eligible investment and cash received are different claims.
- A layout-only conversion changes page content and the agreed icon only. Preserve all database properties, especially Lead ID, Strategy, Newsletter person, contact status, notes, dates and other user edits. Do not reclassify leads, recompute canonical scores or rewrite local research JSON merely to reformat Notion.
- Fetch immediately before editing. If the page changed after drafting, stop and reconcile the new content rather than overwriting it.
- Preserve child pages, databases, synced blocks, unsupported blocks, comments and user-added notes. Use targeted edits. Do not enable content deletion to force a replacement.
- For a new page, query the stable Lead ID first to avoid duplicates, use the live data-source schema, and set the actual Strategy relation and discovery date. No inferred contact details or unrelated newsletter/people merges.
- The original source URLs, observed/published dates and research evidence remain authoritative; polished prose must not increase confidence.

## Verification before completion

- Fetch the written page: check 👤 callout, first H2 Links, exactly two native table columns, ordered sections, working link targets and no unresolved placeholders.
- Confirm every original evidence URL and record is retained, publication dates/statuses are preserved, and extra resource links did not inflate Evidence count.
- Compare all database properties before and after a format-only update; preserve Strategy and Newsletter person relations.
- Confirm exactly the requested pages changed and no duplicate leads were created. For a Notion-only layout change, confirm local canonical JSON files were unchanged; authorized lead creation may add the requested records separately.
- Save a dated change/verification manifest with the template version, reference pages, converted page IDs and outcomes.

## Observed reference pages

These establish the user's layout, not a source of reusable lead facts:

- [Afnan .A.](https://app.notion.com/p/3d2d460a15cb81f2a499e01759f0c2f2)
- [Faisal Abduljawad](https://app.notion.com/p/3d2d460a15cb8143850cd56482ae5e73)
- [Abdulaziz Ghazi Alardi](https://app.notion.com/p/3d2d460a15cb8106b570cde617b04817)

The samples contained some older assessment/contact/date wording. Future pages must use current properties and preserve stronger publication-date evidence, rather than copying those stale values.

Database: https://app.notion.com/p/c250c0fd564445ac9ffa5db49fa98188
Data source: `28107d99-e759-4637-a630-bd11f3be950f` (fetch live before use).
