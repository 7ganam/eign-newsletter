import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const crunchbaseDirectory = resolve(projectRoot, 'outputs/crunchbase')
const manifestPath = resolve(crunchbaseDirectory, 'manifest.json')
const outputPath = resolve(projectRoot, 'assets/crunchbase/yc-companies-missing-graph-data.json')
const startYear = 2005

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const sourceUpdatedAt = manifest.updatedAt || manifest.createdAt
const endYear = Number(String(sourceUpdatedAt).slice(0, 4))

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const isEligibleRound = (round) => {
  const year = Number(String(round.announcedDate || '').slice(0, 4))
  return round.amount?.currency === 'USD'
    && Number.isFinite(round.amount.amount)
    && round.amount.amount > 0
    && isValidDate(round.announcedDate)
    && year >= startYear
    && year <= endYear
}

const items = []

for (const entry of manifest.entries.filter((value) => value.status === 'success')) {
  const insightPath = resolve(crunchbaseDirectory, basename(entry.insightsPath || ''))
  if (!insightPath.endsWith('.insights.json')) continue

  const insight = JSON.parse(await readFile(insightPath, 'utf8'))
  const company = insight.facts?.company || {}
  const rounds = insight.facts?.funding?.rounds || []
  const industries = [...new Set((company.industries || []).map((value) => value.trim()).filter(Boolean))]
  const eligibleRounds = rounds.filter(isEligibleRound)

  if (industries.length && eligibleRounds.length) continue

  const missing = []
  if (!industries.length) missing.push('industries')
  if (!rounds.length) {
    missing.push('fundingRounds')
  } else {
    if (!rounds.some((round) => round.amount?.currency === 'USD' && Number.isFinite(round.amount.amount) && round.amount.amount > 0)) {
      missing.push('fundingAmountUsd')
    }
    if (!rounds.some((round) => isValidDate(round.announcedDate))) missing.push('fundingDate')
    if (rounds.some((round) => {
      const year = Number(String(round.announcedDate || '').slice(0, 4))
      return isValidDate(round.announcedDate) && (year < startYear || year > endYear)
    }) && !eligibleRounds.length) {
      missing.push('insideChartDateRange')
    }
  }

  items.push({
    companyName: company.name || entry.requestedSlug,
    crunchbaseUrl: entry.requestedUrl,
    missing,
    industries,
    fundingRounds: rounds.map((round) => ({
      announcedDate: round.announcedDate || null,
      amountUsd: round.amount?.currency === 'USD' && Number.isFinite(round.amount.amount)
        ? round.amount.amount
        : null,
      roundType: round.type || null,
    })),
  })
}

items.sort((left, right) => left.companyName.localeCompare(right.companyName) || left.crunchbaseUrl.localeCompare(right.crunchbaseUrl))

const missingCounts = {}
for (const item of items) {
  for (const field of item.missing) missingCounts[field] = (missingCounts[field] || 0) + 1
}

await writeFile(outputPath, `${JSON.stringify({
  version: 1,
  purpose: 'Fill missing source fields, then return this file to rebuild the YC funding graphs. Null values are unknown and must not be guessed.',
  source: 'outputs/crunchbase',
  chartEligibility: {
    currency: 'USD',
    endYear,
    startYear,
  },
  summary: {
    companies: items.length,
    missingCounts,
  },
  items,
}, null, 2)}\n`)

console.log(`Wrote ${items.length.toLocaleString()} companies to ${outputPath}`)
