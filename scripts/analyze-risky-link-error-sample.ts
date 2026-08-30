import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { csvCell, parseCsv, type CsvRecord } from './lib/public-yc-crunchbase-links'

const DEFAULT_RUN_DIR =
  'outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z'
const ALLOWED_STATUSES = new Set(['correct', 'wrong', 'unresolved'])
const Z_95 = 1.959963984540054

type Interval = { lower: number; upper: number }

function rowsToCsv(headers: string[], rows: CsvRecord[]) {
  return `${[
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? '')).join(',')),
  ].join('\n')}\n`
}

function wilsonInterval(successes: number, trials: number): Interval {
  if (!Number.isInteger(successes) || !Number.isInteger(trials) || trials < 1) {
    throw new Error(`Invalid Wilson inputs: ${successes}/${trials}`)
  }
  if (successes < 0 || successes > trials) {
    throw new Error(`Successes outside trial range: ${successes}/${trials}`)
  }

  const proportion = successes / trials
  const zSquared = Z_95 ** 2
  const denominator = 1 + zSquared / trials
  const center = (proportion + zSquared / (2 * trials)) / denominator
  const halfWidth =
    (Z_95 / denominator) *
    Math.sqrt(
      (proportion * (1 - proportion)) / trials + zSquared / (4 * trials ** 2),
    )
  return {
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
  }
}

function transformCertaintyStratum(
  interval: Interval,
  sampledPopulation: number,
  totalPopulation: number,
  knownWrong: number,
): Interval {
  return {
    lower: (knownWrong + interval.lower * sampledPopulation) / totalPopulation,
    upper: (knownWrong + interval.upper * sampledPopulation) / totalPopulation,
  }
}

function weightedRate(
  sampledRate: number,
  sampledPopulation: number,
  totalPopulation: number,
  knownWrong: number,
) {
  return (knownWrong + sampledRate * sampledPopulation) / totalPopulation
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function estimatedRows(value: number, population: number) {
  return Math.round(value * population)
}

function assertTextEqual(actual: string, expected: string, context: string) {
  if (actual !== expected) {
    throw new Error(`${context}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

async function main() {
  const runDir = resolve(process.argv[2] ?? DEFAULT_RUN_DIR)
  const auditDir = join(runDir, 'risk-separation', 'risky-link-error-audit')
  const samplePath = join(auditDir, 'risky-link-random-sample.csv')
  const designPath = join(auditDir, 'sample-design.json')
  const sample = parseCsv(await readFile(samplePath, 'utf8'))
  const design = JSON.parse(await readFile(designPath, 'utf8')) as {
    population: {
      riskyRows: number
      previouslyReviewedRiskyRows: number
      unreviewedRiskyRows: number
      categoryCounts: Record<string, number>
    }
    sample: {
      size: number
      seed: string
      method: string
      sampleCategoryCounts: Record<string, number>
    }
    reviewedRiskyRows: Array<{
      yc_id: string
      name: string
      validation_status: string
    }>
  }

  if (sample.length !== design.sample.size) {
    throw new Error(`Sample has ${sample.length} rows; design says ${design.sample.size}`)
  }

  const batchRows = (
    await Promise.all(
      [1, 2, 3, 4].map(async (batch) =>
        parseCsv(await readFile(join(auditDir, `validation-batch-${batch}.csv`), 'utf8')),
      ),
    )
  ).flat()

  if (batchRows.length !== sample.length) {
    throw new Error(`Validation has ${batchRows.length} rows; sample has ${sample.length}`)
  }

  const sampleByOrder = new Map(sample.map((row) => [row.sample_order, row]))
  const seenOrders = new Set<string>()
  for (const validation of batchRows) {
    if (seenOrders.has(validation.sample_order)) {
      throw new Error(`Duplicate validation order ${validation.sample_order}`)
    }
    seenOrders.add(validation.sample_order)
    const sampled = sampleByOrder.get(validation.sample_order)
    if (!sampled) {
      throw new Error(`Validation order ${validation.sample_order} is not in the sample`)
    }
    assertTextEqual(validation.yc_id, sampled.yc_id, `Order ${validation.sample_order} yc_id`)
    assertTextEqual(validation.name, sampled.name, `Order ${validation.sample_order} name`)
    assertTextEqual(
      validation.proposed_crunchbase_url,
      sampled.crunchbase_url,
      `Order ${validation.sample_order} proposed URL`,
    )
    if (!ALLOWED_STATUSES.has(validation.validation_status)) {
      throw new Error(
        `Order ${validation.sample_order} has invalid status ${validation.validation_status}`,
      )
    }
    if (!validation.evidence_url_1 || !validation.validation_note) {
      throw new Error(`Order ${validation.sample_order} lacks evidence or a validation note`)
    }
    if (validation.validation_status === 'wrong' && !validation.evidence_url_2) {
      throw new Error(`Wrong order ${validation.sample_order} lacks a second identity source`)
    }
  }

  const validationByOrder = new Map(batchRows.map((row) => [row.sample_order, row]))
  const validatedSample = sample.map((row) => {
    const validation = validationByOrder.get(row.sample_order)
    if (!validation) {
      throw new Error(`Missing validation for sample order ${row.sample_order}`)
    }
    return {
      ...row,
      validation_status: validation.validation_status,
      corrected_crunchbase_url: validation.corrected_crunchbase_url,
      evidence_url_1: validation.evidence_url_1,
      evidence_url_2: validation.evidence_url_2,
      validation_note: validation.validation_note,
    }
  })

  const counts = Object.fromEntries(
    [...ALLOWED_STATUSES].map((status) => [
      status,
      validatedSample.filter((row) => row.validation_status === status).length,
    ]),
  ) as Record<'correct' | 'wrong' | 'unresolved', number>
  const reviewedCounts = {
    correct: design.reviewedRiskyRows.filter((row) => row.validation_status === 'confirmed')
      .length,
    wrong: design.reviewedRiskyRows.filter((row) => row.validation_status === 'incorrect').length,
  }
  if (reviewedCounts.correct + reviewedCounts.wrong !== design.population.previouslyReviewedRiskyRows) {
    throw new Error('Previously reviewed risky rows contain an unexpected status')
  }

  const totalPopulation = design.population.riskyRows
  const sampledPopulation = design.population.unreviewedRiskyRows
  const sampleSize = validatedSample.length
  const resolvedSize = counts.correct + counts.wrong

  const confirmedWrongRate = weightedRate(
    counts.wrong / sampleSize,
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )
  const allUnresolvedWrongRate = weightedRate(
    (counts.wrong + counts.unresolved) / sampleSize,
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )
  const resolvedOnlyRate = weightedRate(
    counts.wrong / resolvedSize,
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )

  const confirmedWrongInterval = transformCertaintyStratum(
    wilsonInterval(counts.wrong, sampleSize),
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )
  const allUnresolvedWrongInterval = transformCertaintyStratum(
    wilsonInterval(counts.wrong + counts.unresolved, sampleSize),
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )
  const resolvedOnlyInterval = transformCertaintyStratum(
    wilsonInterval(counts.wrong, resolvedSize),
    sampledPopulation,
    totalPopulation,
    reviewedCounts.wrong,
  )

  const analysis = {
    scope: 'risky rows only; lower-risk rows excluded',
    population: {
      totalRiskyRows: totalPopulation,
      knownCertaintyRows: design.population.previouslyReviewedRiskyRows,
      randomlySampledFrameRows: sampledPopulation,
    },
    design: {
      method: design.sample.method,
      seed: design.sample.seed,
      randomSampleSize: sampleSize,
      randomSampleFraction: sampleSize / sampledPopulation,
      knownCertaintyCounts: reviewedCounts,
      sampleCounts: counts,
      sampleCategoryCounts: design.sample.sampleCategoryCounts,
    },
    estimates: {
      centralAssumption: {
        assumption: 'unresolved cases have the same wrong-link rate as resolved cases',
        wrongLinkProbability: resolvedOnlyRate,
        confidenceLevel: 0.95,
        confidenceInterval: resolvedOnlyInterval,
        estimatedWrongRows: estimatedRows(resolvedOnlyRate, totalPopulation),
        estimatedWrongRowsInterval: {
          lower: estimatedRows(resolvedOnlyInterval.lower, totalPopulation),
          upper: estimatedRows(resolvedOnlyInterval.upper, totalPopulation),
        },
      },
      classificationBounds: {
        allUnresolvedCorrect: {
          wrongLinkProbability: confirmedWrongRate,
          confidenceInterval: confirmedWrongInterval,
          estimatedWrongRows: estimatedRows(confirmedWrongRate, totalPopulation),
        },
        allUnresolvedWrong: {
          wrongLinkProbability: allUnresolvedWrongRate,
          confidenceInterval: allUnresolvedWrongInterval,
          estimatedWrongRows: estimatedRows(allUnresolvedWrongRate, totalPopulation),
        },
        combinedSamplingAndClassificationEnvelope: {
          lower: confirmedWrongInterval.lower,
          upper: allUnresolvedWrongInterval.upper,
        },
      },
    },
    notes: [
      'Wilson score intervals are computed on the random-sample component and transformed to include the four fully known certainty rows.',
      'The finite-population correction is intentionally omitted, making intervals slightly conservative.',
      'The central confidence interval assumes unresolved status is unrelated to whether the link is wrong; the classification bounds do not make that assumption.',
      'All 100 randomly selected rows carried unverified_candidate; rare overlapping risk flags were not represented and cannot be estimated separately from this sample.',
    ],
  }

  const report = `# Risky Crunchbase-link error analysis\n\n` +
    `Scope: **risky rows only**; lower-risk rows are excluded.\n\n` +
    `- Risky population: ${totalPopulation.toLocaleString()} rows\n` +
    `- Fresh random sample: ${sampleSize} of ${sampledPopulation.toLocaleString()} previously unreviewed risky rows\n` +
    `- Fresh labels: ${counts.correct} correct, ${counts.wrong} wrong, ${counts.unresolved} unresolved\n` +
    `- Certainty stratum: ${reviewedCounts.correct} correct and ${reviewedCounts.wrong} wrong\n\n` +
    `## Result\n\n` +
    `The central estimate is **${percent(resolvedOnlyRate)} wrong** (${estimatedRows(resolvedOnlyRate, totalPopulation).toLocaleString()} of ${totalPopulation.toLocaleString()}), under the assumption that unresolved cases have the same error rate as resolved cases. Its 95% Wilson interval is **${percent(resolvedOnlyInterval.lower)} to ${percent(resolvedOnlyInterval.upper)}**.\n\n` +
    `Because ${counts.unresolved} sampled links remain unresolved, the directly identified point range is **${percent(confirmedWrongRate)} to ${percent(allUnresolvedWrongRate)}**: the lower endpoint treats every unresolved link as correct; the upper endpoint treats every unresolved link as wrong. Combining those classification extremes with sampling uncertainty gives a conservative envelope of **${percent(confirmedWrongInterval.lower)} to ${percent(allUnresolvedWrongInterval.upper)}**.\n\n` +
    `Wilson intervals omit the finite-population correction and are therefore slightly conservative. All ${sampleSize} randomly selected rows carried the dominant unverified_candidate flag, so rare overlapping risk categories cannot be estimated separately here.\n`

  const validatedPath = join(auditDir, 'risky-link-random-sample-validated.csv')
  const analysisPath = join(auditDir, 'risky-link-error-analysis.json')
  const reportPath = join(auditDir, 'risky-link-error-analysis.md')
  await Promise.all([
    writeFile(validatedPath, rowsToCsv(Object.keys(validatedSample[0]), validatedSample)),
    writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`),
    writeFile(reportPath, report),
  ])

  console.log(report)
  console.log(`Validated sample: ${validatedPath}`)
  console.log(`Analysis JSON: ${analysisPath}`)
  console.log(`Report: ${reportPath}`)
}

await main()
