import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIncludedChartIndustry } from './lib/yc-industry-chart-filter'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_FILE = resolve(PROJECT_ROOT, 'data/industry-funding/crunchbase-yc-industry-funding-by-year.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-all-time-smoothed.csv')
const PASTE_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-all-time-smoothed.tsv')
const FRAME_STEP_DAYS = 14
const SMOOTHING_DAYS = 30
const USD_PER_MILLION = 1_000_000
const DAY_MS = 24 * 60 * 60 * 1000

type FundingDay = { amountUsd: number; date: string }
type Industry = { days?: FundingDay[]; name: string }
type Snapshot = {
  scopes: { lowerRisk: { industries: Industry[] } }
}

const parseUtcDate = (date: string) => new Date(`${date}T00:00:00Z`)
const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
}).format(date)
const daysBetween = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / DAY_MS)

const buildFrames = (start: Date, end: Date) => {
  const frames: Date[] = []
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + FRAME_STEP_DAYS * DAY_MS)) {
    frames.push(cursor)
  }
  if (frames.at(-1)?.getTime() !== end.getTime()) frames.push(end)
  return frames
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const smoothedContribution = (funding: FundingDay, frame: Date, datasetEnd: Date) => {
  const fundingDate = parseUtcDate(funding.date)
  const elapsedDays = daysBetween(fundingDate, frame) + 1
  if (elapsedDays <= 0) return 0

  // Visually ease each disclosed round into the cumulative total. The final
  // observation is shortened when needed so it still reconciles exactly.
  const durationDays = Math.min(SMOOTHING_DAYS, daysBetween(fundingDate, datasetEnd) + 1)
  return funding.amountUsd * Math.min(1, elapsedDays / durationDays)
}

const main = async () => {
  const snapshot = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as Snapshot
  const industries = snapshot.scopes.lowerRisk.industries
    .filter((industry) => isIncludedChartIndustry(industry.name))
    .map((industry) => ({
      funding: (industry.days ?? [])
        .filter((day) => Number.isFinite(day.amountUsd) && day.amountUsd > 0 && /^\d{4}-\d{2}-\d{2}$/.test(day.date))
        .sort((left, right) => left.date.localeCompare(right.date)),
      name: industry.name,
    }))
    .filter((industry) => industry.funding.length > 0)

  const fundingDates = industries.flatMap((industry) => industry.funding.map((funding) => funding.date)).sort()
  const start = parseUtcDate(fundingDates[0])
  const end = parseUtcDate(fundingDates.at(-1) as string)
  const frames = buildFrames(start, end)

  const rows = industries.map((industry) => {
    const values = frames.map((frame) => Number((industry.funding.reduce(
      (total, funding) => total + smoothedContribution(funding, frame, end),
      0,
    ) / USD_PER_MILLION).toFixed(6)))
    return { finalAmountMillions: values.at(-1) ?? 0, name: industry.name, values }
  }).sort((left, right) => right.finalAmountMillions - left.finalAmountMillions || left.name.localeCompare(right.name))

  const frameLabels = frames.map(formatDate)
  const csv = [
    ['Industry', 'Category', 'Image', ...frameLabels].map(csvCell).join(','),
    ...rows.map((row) => [row.name, '', '', ...row.values].map(csvCell).join(',')),
  ].join('\n')
  const tsv = [
    ['Industry', 'Category', 'Image', ...frameLabels].join('\t'),
    ...rows.map((row) => [row.name, '', '', ...row.values].join('\t')),
  ].join('\n')

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, `${csv}\n`, 'utf8')
  await writeFile(PASTE_FILE, `${tsv}\n`, 'utf8')
  const finalTotalMillions = rows.reduce((total, row) => total + row.finalAmountMillions, 0)
  console.log(`Wrote ${rows.length} industries and ${frameLabels.length} continuous frames (${frameLabels[0]} to ${frameLabels.at(-1)}) to ${OUTPUT_FILE}`)
  console.log(`Final cumulative total: $${finalTotalMillions.toFixed(3)}M`)
}

await main()
