---
name: eign-notion-lead-pages
description: Creates and reformats EIGN Notion lead pages using the links-first layout, dated evidence, and preserved lead properties. Use when creating, importing, standardizing, or updating the content of lead pages in the EIGN Notion leads database; not for prospect discovery, outreach, or local table UI changes.
---

# EIGN Notion lead pages

Produce a readable lead page using the user's established layout without changing the underlying research or user-managed properties merely to format it.

## Required resources

Before drafting a page, read [the page standard](references/page-standard.md) in full and inspect [the Notion page template](assets/lead-page-template.md). The standard defines the section order, evidence fields, qualification caveats, and preservation checks. The template is a starting artifact, not content to publish with placeholders.

For Notion writes, read the native connector's current enhanced Markdown specification. Do not substitute generic HTML for Notion tables or callouts.

## Workflow

1. Resolve the requested lead pages and the current Notion database/data source through the native connector. Use the destination pointers in the standard as lookup hints, not a frozen schema. If native access is unavailable, prepare a local draft and report the publishing blocker; do not switch to browser automation.
2. Read the canonical local research for the selected leads and fetch their current Notion properties/content. Local research files are under `assets/lead-research/` relative to the repository root. Keep current Notion contact status, notes, and relations; do not overwrite them from an older local snapshot.
3. For a new lead, query its stable **Lead ID** before creating a page. Use the live property names/types, original discovery date, and actual Strategy relation. An existing match is not a new lead; update it only within the user's requested scope.
4. For a layout conversion, preserve all page properties, source evidence, dates, user notes, comments and child content. Draft from the lead's own facts, not from another lead's sample values. The agreed page body and blank/default icon are the only formatting targets.
5. Adapt the template: short profile callout; **Links** as the first H2 with a native two-column table; why included; quick assessment; specific next research step; complete source evidence; lead details; research metadata. Keep uncertainty visible and distinguish evidence publication from observation dates.
6. Re-fetch immediately before writing. Reconcile intervening edits, unexpected child/synced blocks, or comments before proceeding. Prefer targeted content changes; never enable content deletion to force a format conversion. A validation failure requires inspecting the current state, not a blind full replacement.
7. Fetch the result and follow the standard's verification checklist. Compare all properties before/after a format-only change, retain every evidence URL/date/record, and verify no duplicate lead was created. Keep extra resource links out of Evidence count.

## Boundaries

- Newer explicit user instructions override the saved layout. Inspect a user-edited reference when the user says the structure changed.
- Formatting does not authorize new research, qualification changes, outreach, contact enrichment, database-schema changes, or merges into newsletter/people datasets.
- Preserve **Needs verification** when the actual unbuilt-product, current builder maximum, or paid-buying evidence is missing. Program membership and profile silence cannot close those gaps.
- Preserve canonical local JSON during a Notion-only layout task. Save generated page drafts and a dated verification manifest separately under `outputs/lead-research/` when useful for the requested work.

## Example requests

- “Create these researched leads in Notion using our standard lead-page layout.”
- “Reformat the three new leads to match the Links table at the top; keep their statuses and relations unchanged.”

For a draft-only request, return the draft and checks without publishing. For an authorized creation or conversion, report the exact pages changed, verification outcome, and any unresolved access or data gaps.
