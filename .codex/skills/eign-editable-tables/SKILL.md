---
name: eign-editable-tables
description: Build or modify data tables in the EIGN newsletter workspace with the project's standard inline editing, multi-select archiving, draggable and resizable columns, persistent layout, and sortable headers. Use whenever adding or changing a data table in this repository.
---

# EIGN editable table standard

Keep EIGN tables visually and behaviorally consistent with the existing dense, spreadsheet-like workspace.

## Required interaction contract

- Make user-owned data fields editable inline. Reuse `src/editableCells.tsx` so pencil, double-click, Enter-to-save, Escape-to-cancel, saving, and error behavior stay consistent.
- Persist edits through the local API into the underlying file-backed source. Update React state from the returned saved row and surface save failures without pretending the edit succeeded.
- Render columns from one ordered column definition. Reorder columns from a dedicated header grip with before/after insertion feedback, and persist the validated order under a versioned, table-specific localStorage key.
- Sort rows from the header button. Show an ascending or descending arrow on the active column, set `aria-sort`, preserve a stable tie-breaker, and persist the sort with `src/tablePreferences.ts`.
- Keep column resizing available through `src/resizableColumns.tsx`, including pointer, keyboard, reset, and versioned persistence behavior.
- Keep the drag grip, sort button, and resize edge as separate hit targets. Header order and row-cell order must always come from the same ordered column list.
- Give every row a selection checkbox and every table a select-all control scoped to the rows represented by that view. Reuse `src/rowArchive.tsx` so selection, indeterminate state, bulk actions, errors, and accessibility stay consistent.
- Archive selected rows through `/api/table-archives/:tableId`; never delete source records for a normal table archive action. Hide archived rows from the active view, expose the archived view, and allow selected archived rows to be restored.
- Use a stable dataset-level archive ID so the same entity remains archived in every table where it appears. Keep the selection column fixed at the leading edge and outside user-reorderable data columns.

Derived values and immutable provenance may remain read-only when editing them would corrupt the data model. Make that exception visually explicit; do not silently leave ordinary data fields uneditable.

## Visual contract

Reuse the established `company-table`, `vc-table`, shared inline-edit, header-grip, sort-arrow, resize-handle, sticky-header, and horizontal-overflow styles before adding table-specific CSS. Preserve the compact editorial-ledger typography, borders, row density, focus states, and error treatment used by neighboring tables.

## Persistence and verification

Use stable row IDs and atomic file writes. If a table is generated, store UI edits in a small override file and apply those overrides during regeneration so edits survive both reloads and rebuilds.

Before handing off a table change:

- Run `pnpm build` and `git diff --check`.
- In Microsoft Edge, edit a representative cell and verify the value after reload.
- Drag a column, verify header and body movement, then reload and confirm the order persisted.
- Sort one text or numeric column in both directions and verify the first rows, arrow, and `aria-sort`.
- Resize a column and verify the width persists after reload.
- Select multiple rows individually, archive them, and verify they disappear from the active view after reload.
- Open the archived view, select the archived rows, restore them, and verify they return to the active view after reload.
- Use select-all with an active filter or page and verify its scope matches the table label and indeterminate checkbox state.
- Check the browser console for errors.

Do not trust a synthetic drag action merely because it reports success; verify the resulting DOM order and persisted storage value.
