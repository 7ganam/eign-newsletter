# Risky Crunchbase-link error analysis

Scope: **risky rows only**; lower-risk rows are excluded.

- Risky population: 3,653 rows
- Fresh random sample: 100 of 3,649 previously unreviewed risky rows
- Fresh labels: 53 correct, 32 wrong, 15 unresolved
- Certainty stratum: 2 correct and 2 wrong

## Result

The central estimate is **37.7% wrong** (1,376 of 3,653), under the assumption that unresolved cases have the same error rate as resolved cases. Its 95% Wilson interval is **28.1% to 48.3%**.

Because 15 sampled links remain unresolved, the directly identified point range is **32.0% to 47.0%**: the lower endpoint treats every unresolved link as correct; the upper endpoint treats every unresolved link as wrong. Combining those classification extremes with sampling uncertainty gives a conservative envelope of **23.7% to 56.7%**.

Wilson intervals omit the finite-population correction and are therefore slightly conservative. All 100 randomly selected rows carried the dominant unverified_candidate flag, so rare overlapping risk categories cannot be estimated separately here.
