import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIncludedChartIndustry } from './lib/yc-industry-chart-filter'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_FILE = resolve(PROJECT_ROOT, 'data/industry-funding/crunchbase-yc-industry-funding-by-year.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-monthly-2025.csv')
const PASTE_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-monthly-2025.tsv')
const YEAR = 2025
const USD_PER_BILLION = 1_000_000_000
const MONTH_LABELS = [
  'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
  'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025',
]

type FundingDay = { amountUsd: number; date: string }
type Industry = { days?: FundingDay[]; name: string }
type Snapshot = {
  scopes: { lowerRisk: { industries: Industry[] } }
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const main = async () => {
  const snapshot = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as Snapshot
  const industries = snapshot.scopes.lowerRisk.industries
    .filter((industry) => isIncludedChartIndustry(industry.name))
    .map((industry) => ({
      daily: (industry.days ?? [])
        .filter((day) => day.date.startsWith(`${YEAR}-`))
        .sort((left, right) => left.date.localeCompare(right.date)),
      name: industry.name,
    }))
    .filter((industry) => industry.daily.length > 0)

  const rows = industries.map((industry) => {
    let cumulative = 0
    let dayIndex = 0
    const values = MONTH_LABELS.map((_, monthIndex) => {
      const monthEnd = `${YEAR}-${String(monthIndex + 1).padStart(2, '0')}-99`
      while (dayIndex < industry.daily.length && industry.daily[dayIndex].date <= monthEnd) {
        cumulative += industry.daily[dayIndex].amountUsd
        dayIndex += 1
      }
      return Number((cumulative / USD_PER_BILLION).toFixed(6))
    })
    return { finalAmountBillions: values.at(-1) ?? 0, name: industry.name, values }
  }).sort((left, right) => right.finalAmountBillions - left.finalAmountBillions || left.name.localeCompare(right.name))

  const csv = [
    ['Industry', 'Category', 'Image', ...MONTH_LABELS].map(csvCell).join(','),
    ...rows.map((row) => [row.name, '', '', ...row.values].map(csvCell).join(',')),
  ].join('\n')
  const tsv = [
    ['Industry', 'Category', 'Image', ...MONTH_LABELS].join('\t'),
    ...rows.map((row) => [row.name, '', '', ...row.values].join('\t')),
  ].join('\n')

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, `${csv}\n`, 'utf8')
  await writeFile(PASTE_FILE, `${tsv}\n`, 'utf8')
  console.log(`Wrote ${rows.length} industries and ${MONTH_LABELS.length} monthly frames to ${OUTPUT_FILE}`)
}

await main()
