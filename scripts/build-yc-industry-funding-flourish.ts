import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIncludedChartIndustry } from './lib/yc-industry-chart-filter'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_FILE = resolve(PROJECT_ROOT, 'data/industry-funding/crunchbase-yc-industry-funding-by-year.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-2025.csv')
const PASTE_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-2025.tsv')
const YEAR = 2025
const DAY_MS = 86_400_000

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
  const start = Date.UTC(YEAR, 0, 1)
  const end = Date.UTC(YEAR, 11, 31)
  const dates = Array.from(
    { length: Math.floor((end - start) / DAY_MS) + 1 },
    (_, index) => new Date(start + index * DAY_MS).toISOString().slice(0, 10),
  )
  const industries = snapshot.scopes.lowerRisk.industries
    .filter((industry) => isIncludedChartIndustry(industry.name))
    .map((industry) => ({
      daily: new Map(
        (industry.days ?? [])
          .filter((day) => day.date.startsWith(`${YEAR}-`))
          .map((day) => [day.date, day.amountUsd]),
      ),
      name: industry.name,
    }))
    .filter((industry) => industry.daily.size > 0)

  const finalTotal = industries.reduce(
    (total, industry) => total + [...industry.daily.values()].reduce((sum, value) => sum + value, 0),
    0,
  )
  const rows = industries.map((industry) => {
    let cumulative = 0
    const values = dates.map((date) => {
      cumulative += industry.daily.get(date) ?? 0
      return finalTotal ? Number((cumulative / finalTotal * 100).toFixed(6)) : 0
    })
    return { finalShare: values.at(-1) ?? 0, name: industry.name, values }
  }).sort((left, right) => right.finalShare - left.finalShare || left.name.localeCompare(right.name))

  const csv = [
    ['Industry', 'Category', 'Image', ...dates].map(csvCell).join(','),
    ...rows.map((row) => [row.name, '', '', ...row.values].map(csvCell).join(',')),
  ].join('\n')
  const tsv = [
    ['Industry', 'Category', 'Image', ...dates].join('\t'),
    ...rows.map((row) => [row.name, '', '', ...row.values].join('\t')),
  ].join('\n')

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, `${csv}\n`, 'utf8')
  await writeFile(PASTE_FILE, `${tsv}\n`, 'utf8')
  console.log(`Wrote ${rows.length} industries and ${dates.length} daily frames to ${OUTPUT_FILE}`)
}

await main()
