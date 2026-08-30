import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

import { parseCsv, type CsvRecord } from './lib/public-yc-crunchbase-links'

const DEFAULT_RUN_DIR =
  'outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z'

const RISK_CATEGORIES = [
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
] as const

const RISK_COLUMNS = [
  'risk_categories',
  'risk_count',
  'risk_unverified_candidate',
  'risk_archive_observed_candidate',
  'risk_source_conflict',
  'risk_url_collision',
  'risk_invalid_source_value',
  'risk_historical_only',
  'risk_invalid_company_website',
  'risk_slug_only_source',
  'risk_sample_validation_failed',
  'risk_sample_validation_unresolved',
  'collision_yc_ids',
  'conflict_datahive_url',
  'conflict_radema_url',
  'manual_validation_status',
  'validated_crunchbase_url',
  'manual_validation_note',
] as const

type RiskCategory = (typeof RISK_CATEGORIES)[number]

type ClassifiedRow = CsvRecord & Record<(typeof RISK_COLUMNS)[number], string>

function csvCell(value: string) {
  if (!/[",\r\n]/.test(value)) {
    return value
  }
  return `"${value.replaceAll('"', '""')}"`
}

function rowsToCsv(headers: string[], rows: CsvRecord[]) {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? '')).join(',')),
  ]
  return `${lines.join('\n')}\n`
}

function requireColumns(rows: CsvRecord[], required: string[], filename: string) {
  const columns = new Set(Object.keys(rows[0] ?? {}))
  const missing = required.filter((column) => !columns.has(column))
  if (missing.length > 0) {
    throw new Error(`${filename} is missing required columns: ${missing.join(', ')}`)
  }
}

function hasUsableCompanyWebsite(value: string) {
  const candidate = value.trim()
  if (!candidate || candidate.includes(',')) return false

  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
    return Boolean(url.hostname && url.hostname.includes('.'))
  } catch {
    return false
  }
}

async function main() {
  const runDir = resolve(process.argv[2] ?? DEFAULT_RUN_DIR)
  const auditPath = join(runDir, 'yc-crunchbase-audit.csv')
  const conflictsPath = join(runDir, 'yc-crunchbase-source-conflicts.csv')
  const validationPath = join(runDir, 'yc-crunchbase-manual-validation.csv')
  const auditRows = parseCsv(await readFile(auditPath, 'utf8'))
  const conflictRows = parseCsv(await readFile(conflictsPath, 'utf8'))
  let validationRows: CsvRecord[] = []
  try {
    validationRows = parseCsv(await readFile(validationPath, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  requireColumns(
    auditRows,
    [
      'yc_id',
      'link_status',
      'crunchbase_url',
      'historical_only',
      'invalid_source_value',
      'website',
    ],
    basename(auditPath),
  )
  requireColumns(
    conflictRows,
    ['yc_id', 'datahive_url', 'radema_url'],
    basename(conflictsPath),
  )
  if (validationRows.length > 0) {
    requireColumns(
      validationRows,
      ['yc_id', 'validation_status', 'validated_crunchbase_url', 'validation_note'],
      basename(validationPath),
    )
  }

  const conflictByYcId = new Map(conflictRows.map((row) => [row.yc_id, row]))
  const validationByYcId = new Map(validationRows.map((row) => [row.yc_id, row]))
  const ycIdsByUrl = new Map<string, Set<string>>()
  for (const row of auditRows) {
    if (!row.crunchbase_url) continue
    const ids = ycIdsByUrl.get(row.crunchbase_url) ?? new Set<string>()
    ids.add(row.yc_id)
    ycIdsByUrl.set(row.crunchbase_url, ids)
  }

  const classifiedRows: ClassifiedRow[] = auditRows.map((row) => {
    const conflict = conflictByYcId.get(row.yc_id)
    const validation = validationByYcId.get(row.yc_id)
    const collisionIds = ycIdsByUrl.get(row.crunchbase_url) ?? new Set<string>()
    const categories: RiskCategory[] = []

    if (row.link_status === 'unverified_candidate') {
      categories.push('unverified_candidate')
    }
    if (row.link_status === 'archive_observed_candidate') {
      categories.push('archive_observed_candidate')
    }
    if (conflict) {
      categories.push('source_conflict')
    }
    if (collisionIds.size > 1) {
      categories.push('url_collision')
    }
    if (row.invalid_source_value.trim()) {
      categories.push('invalid_source_value')
    }
    if (row.historical_only === 'true') {
      categories.push('historical_only')
    }
    if (!hasUsableCompanyWebsite(row.website)) {
      categories.push('invalid_company_website')
    }
    if (row.evidence.endsWith('_cb_slug')) {
      categories.push('slug_only_source')
    }
    if (validation?.validation_status === 'incorrect') {
      categories.push('sample_validation_failed')
    }
    if (validation?.validation_status === 'unresolved') {
      categories.push('sample_validation_unresolved')
    }

    const has = (category: RiskCategory) => String(categories.includes(category))
    return {
      ...row,
      risk_categories: categories.join(';'),
      risk_count: String(categories.length),
      risk_unverified_candidate: has('unverified_candidate'),
      risk_archive_observed_candidate: has('archive_observed_candidate'),
      risk_source_conflict: has('source_conflict'),
      risk_url_collision: has('url_collision'),
      risk_invalid_source_value: has('invalid_source_value'),
      risk_historical_only: has('historical_only'),
      risk_invalid_company_website: has('invalid_company_website'),
      risk_slug_only_source: has('slug_only_source'),
      risk_sample_validation_failed: has('sample_validation_failed'),
      risk_sample_validation_unresolved: has('sample_validation_unresolved'),
      collision_yc_ids:
        collisionIds.size > 1 ? [...collisionIds].sort((a, b) => a.localeCompare(b)).join(';') : '',
      conflict_datahive_url: conflict?.datahive_url ?? '',
      conflict_radema_url: conflict?.radema_url ?? '',
      manual_validation_status: validation?.validation_status ?? '',
      validated_crunchbase_url: validation?.validated_crunchbase_url ?? '',
      manual_validation_note: validation?.validation_note ?? '',
    }
  })

  const riskyRows = classifiedRows.filter((row) => row.risk_categories)
  const nonRiskyRows = classifiedRows.filter((row) => !row.risk_categories)
  const auditHeaders = Object.keys(auditRows[0] ?? {})
  const classifiedHeaders = [...auditHeaders, ...RISK_COLUMNS]
  const categoryCounts = Object.fromEntries(
    RISK_CATEGORIES.map((category) => [
      category,
      riskyRows.filter((row) => row.risk_categories.split(';').includes(category)).length,
    ]),
  )

  const outputDir = join(runDir, 'risk-separation')
  const categoryDir = join(outputDir, 'risky-categories')
  await mkdir(outputDir, { recursive: true })
  await mkdir(categoryDir, { recursive: true })
  const categoryFiles = Object.fromEntries(
    RISK_CATEGORIES.map((category) => [
      category,
      join(categoryDir, `yc-crunchbase-risk-${category.replaceAll('_', '-')}.csv`),
    ]),
  )
  await Promise.all([
    writeFile(
      join(outputDir, 'yc-crunchbase-risky.csv'),
      rowsToCsv(classifiedHeaders, riskyRows),
    ),
    writeFile(
      join(outputDir, 'yc-crunchbase-non-risky.csv'),
      rowsToCsv(classifiedHeaders, nonRiskyRows),
    ),
    writeFile(
      join(outputDir, 'yc-crunchbase-non-risky-links.txt'),
      `${nonRiskyRows.map((row) => row.crunchbase_url).join('\n')}\n`,
    ),
    ...RISK_CATEGORIES.map((category) =>
      writeFile(
        categoryFiles[category],
        rowsToCsv(
          classifiedHeaders,
          riskyRows.filter((row) => row.risk_categories.split(';').includes(category)),
        ),
      ),
    ),
    writeFile(
      join(outputDir, 'yc-crunchbase-risk-summary.json'),
      `${JSON.stringify(
        {
          sourceAudit: auditPath,
          totalRows: auditRows.length,
          riskyUniqueRows: riskyRows.length,
          nonRiskyRows: nonRiskyRows.length,
          categoryCounts,
          categoryFiles,
          definition: {
            nonRisky:
              'publicly sourced by full Crunchbase URL, present in the current YC roster, with a usable company website, no source conflict, URL collision, invalid source value, or observed validation failure/unresolved result',
            categoryCountsMayOverlap: true,
          },
        },
        null,
        2,
      )}\n`,
    ),
  ])

  console.log(
    JSON.stringify(
      {
        outputDir,
        totalRows: auditRows.length,
        riskyUniqueRows: riskyRows.length,
        nonRiskyRows: nonRiskyRows.length,
        categoryCounts,
      },
      null,
      2,
    ),
  )
}

await main()
