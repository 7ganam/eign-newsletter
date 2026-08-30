import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { csvCell, parseCsv, type CsvRecord } from './lib/public-yc-crunchbase-links'

const DEFAULT_RUN_DIR =
  'outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z'
const DEFAULT_SAMPLE_SIZE = 100
const DEFAULT_SEED = 'risky-link-error-audit-2026-08-28-v1'

function rowsToCsv(headers: string[], rows: CsvRecord[]) {
  return `${[
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? '')).join(',')),
  ].join('\n')}\n`
}

function sampleKey(seed: string, ycId: string) {
  return createHash('sha256').update(`${seed}:${ycId}`).digest('hex')
}

async function main() {
  const runDir = resolve(process.argv[2] ?? DEFAULT_RUN_DIR)
  const sampleSize = Number(process.argv[3] ?? DEFAULT_SAMPLE_SIZE)
  const seed = process.argv[4] ?? DEFAULT_SEED
  if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    throw new Error(`Invalid sample size: ${String(process.argv[3])}`)
  }

  const riskyPath = join(runDir, 'risk-separation', 'yc-crunchbase-risky.csv')
  const reviewedPath = join(runDir, 'yc-crunchbase-manual-validation.csv')
  const riskyRows = parseCsv(await readFile(riskyPath, 'utf8'))
  const reviewedRows = parseCsv(await readFile(reviewedPath, 'utf8'))
  const riskyIds = new Set(riskyRows.map((row) => row.yc_id))
  const reviewedRiskyRows = reviewedRows.filter((row) => riskyIds.has(row.yc_id))
  const reviewedIds = new Set(reviewedRiskyRows.map((row) => row.yc_id))
  const unreviewedRiskyRows = riskyRows.filter((row) => !reviewedIds.has(row.yc_id))
  if (sampleSize > unreviewedRiskyRows.length) {
    throw new Error(
      `Sample size ${sampleSize} exceeds ${unreviewedRiskyRows.length} unreviewed risky rows`,
    )
  }

  const sampledRows: CsvRecord[] = unreviewedRiskyRows
    .map((row) => ({ row, key: sampleKey(seed, row.yc_id) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(0, sampleSize)
    .map(({ row }, index) => ({
      sample_order: String(index + 1),
      ...row,
      validation_status: '',
      corrected_crunchbase_url: '',
      evidence_url_1: '',
      evidence_url_2: '',
      validation_note: '',
    }))

  const categoryCounts = Object.fromEntries(
    [
      'unverified_candidate',
      'archive_observed_candidate',
      'source_conflict',
      'url_collision',
      'invalid_source_value',
      'historical_only',
      'invalid_company_website',
      'slug_only_source',
      'sample_validation_failed',
      'sample_validation_unresolved',
    ].map((category) => [
      category,
      riskyRows.filter((row) => row.risk_categories.split(';').includes(category)).length,
    ]),
  )
  const sampleCategoryCounts = Object.fromEntries(
    Object.keys(categoryCounts).map((category) => [
      category,
      sampledRows.filter((row) => row.risk_categories.split(';').includes(category)).length,
    ]),
  )

  const outputDir = join(runDir, 'risk-separation', 'risky-link-error-audit')
  await mkdir(outputDir, { recursive: true })
  const samplePath = join(outputDir, 'risky-link-random-sample.csv')
  await Promise.all([
    writeFile(samplePath, rowsToCsv(Object.keys(sampledRows[0]), sampledRows)),
    writeFile(
      join(outputDir, 'sample-design.json'),
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          population: {
            riskyRows: riskyRows.length,
            previouslyReviewedRiskyRows: reviewedRiskyRows.length,
            unreviewedRiskyRows: unreviewedRiskyRows.length,
            categoryCounts,
          },
          sample: {
            frame: 'unreviewed risky rows only',
            method: 'simple random sample without replacement via SHA-256 ordering',
            size: sampleSize,
            seed,
            sampleCategoryCounts,
            output: samplePath,
          },
          reviewedRiskyRows: reviewedRiskyRows.map((row) => ({
            yc_id: row.yc_id,
            name: row.name,
            validation_status: row.validation_status,
          })),
        },
        null,
        2,
      )}\n`,
    ),
  ])

  console.log(samplePath)
}

await main()
