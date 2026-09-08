// These are literal Crunchbase labels that describe a broad medium, audience,
// or catch-all sector rather than a useful industry. They are excluded only
// from derived chart exports; the Crunchbase snapshot and annual source data
// retain every original label.
export const EXCLUDED_GENERIC_CHART_INDUSTRIES = new Set([
  'Apps',
  'B2B',
  'B2C',
  'Consumer',
  'Enterprise',
  'Information Technology',
  'Internet',
  'Mobile',
  'Mobile Apps',
  'Service Industry',
  'Software',
])

export const isIncludedChartIndustry = (industry: string) =>
  !EXCLUDED_GENERIC_CHART_INDUSTRIES.has(industry)
