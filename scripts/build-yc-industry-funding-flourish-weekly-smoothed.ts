import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIncludedChartIndustry } from './lib/yc-industry-chart-filter'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-by-year.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-weekly-smoothed-2025.csv')
const PASTE_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-weekly-smoothed-2025.tsv')
const YEAR = 2025
const SMOOTHING_DAYS = 30
const USD_PER_BILLION = 1_000_000_000
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

const weeklyFrames = () => {
  const start = parseUtcDate(`${YEAR}-01-01`)
  const end = parseUtcDate(`${YEAR}-12-31`)
  const frames: Date[] = []

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 7 * DAY_MS)) {
    frames.push(cursor)
  }
  if (frames.at(-1)?.getTime() !== end.getTime()) frames.push(end)
  return frames
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const smoothedContribution = (funding: FundingDay, frame: Date, yearEnd: Date) => {
  const fundingDate = parseUtcDate(funding.date)
  const elapsedDays = daysBetween(fundingDate, frame) + 1
  if (elapsedDays <= 0) return 0

  // Late-December rounds use the remaining days in the year so the final frame
  // still reconciles to the complete disclosed 2025 total.
  const durationDays = Math.min(SMOOTHING_DAYS, daysBetween(fundingDate, yearEnd) + 1)
  return funding.amountUsd * Math.min(1, elapsedDays / durationDays)
}

const main = async () => {
  const snapshot = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as Snapshot
  const frames = weeklyFrames()
  const yearEnd = parseUtcDate(`${YEAR}-12-31`)
  const industries = snapshot.scopes.lowerRisk.industries
    .filter((industry) => isIncludedChartIndustry(industry.name))
    .map((industry) => ({
      funding: (industry.days ?? [])
        .filter((day) => day.date.startsWith(`${YEAR}-`))
        .sort((left, right) => left.date.localeCompare(right.date)),
      name: industry.name,
    }))
    .filter((industry) => industry.funding.length > 0)

  const rows = industries.map((industry) => {
    const values = frames.map((frame) => Number((industry.funding.reduce(
      (total, funding) => total + smoothedContribution(funding, frame, yearEnd),
      0,
    ) / USD_PER_BILLION).toFixed(9)))
    return { finalAmountBillions: values.at(-1) ?? 0, name: industry.name, values }
  }).sort((left, right) => right.finalAmountBillions - left.finalAmountBillions || left.name.localeCompare(right.name))

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
  console.log(`Wrote ${rows.length} industries and ${frameLabels.length} weekly frames to ${OUTPUT_FILE}`)
}

await main()
