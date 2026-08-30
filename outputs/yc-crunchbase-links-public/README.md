# YC Crunchbase link export without Crunchbase access

This export is built from public YC-specific datasets and a public web-archive
index. It never opens Crunchbase, Microsoft Edge, a browser profile, cookies, or
an API key.

## Run

Use the snapshots already on disk (zero network):

```sh
pnpm export:yc-crunchbase-links:public
```

Refresh the exact allowlisted YC, Hugging Face, and GitHub snapshots, then
export:

```sh
pnpm export:yc-crunchbase-links:public --refresh-sources
```

The refresh client accepts HTTPS responses only from `huggingface.co`,
`raw.githubusercontent.com`, and `yc-oss.github.io`. Redirect destinations are
checked before following them. Crunchbase is not in the allowlist.

## Which output to use

- `yc-crunchbase-links.txt` is the conservative list. Every URL was explicitly
  present in at least one public YC-specific source, but was not live-checked.
  It is a deduplicated links inventory, not one URL per company: historical
  alternatives, source conflicts, and source-only Kaggle rows are retained.
- `yc-crunchbase-all-candidates.txt` is the broad input list for a later
  scraper. It adds URLs inferred from YC slugs or, for a small historical gap,
  company names. Some candidates will be missing, stale, or wrong.
- `yc-crunchbase-audit.csv` maps the union YC roster to evidence and confidence
  status.
- `yc-crunchbase-public-evidence.csv` preserves every source row behind the
  conservative URL list.
- `manifest.json` records exact source hashes, row counts, licenses, conflicts,
  and the zero-Crunchbase network attestation.

The manifest separates roster-mapped links from source-only links and reports
URLs mapped to multiple YC IDs. Treat the network section as a code-generated
attestation backed by the hostname allowlist, not as an external packet capture.

Do not bulk-open either URL list with the logged-in Crunchbase scraper unless
account usage has been explicitly approved. Generating the lists uses no
Crunchbase allowance; opening the resulting pages later may do so.

## License caution

The DataHive repository metadata says CC BY-NC 2.0 while its README says CC
BY-NC 4.0. The Radema source declares MIT and the historical Kaggle source
declares CC BY-SA 4.0. These are uploader declarations, not proof that every
third-party field can be relicensed. Resolve the DataHive discrepancy before
commercial redistribution.
