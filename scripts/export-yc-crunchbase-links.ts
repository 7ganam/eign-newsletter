import { mkdir, open, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  parseFundingRoundPage,
  PortfolioLinkCollector,
} from './lib/yc-crunchbase-links'

const API_ENDPOINT =
  'https://api.crunchbase.com/v4/data/searches/funding_rounds'
const API_KEY_ENV = 'CRUNCHBASE_API_KEY'
const DEFAULT_OUTPUT_DIR = 'outputs/yc-crunchbase-links'
const INVESTOR_NAME = 'Y Combinator'
const PAGE_SIZE = 1_000
const REQUEST_INTERVAL_MS = 550
const MAX_ATTEMPTS_PER_PAGE = 3
const MAX_REQUEST_BUDGET = 20
const MAX_RETRY_WAIT_MS = 30_000
const MAX_SOURCE_ROWS = 20_000
const REQUEST_TIMEOUT_MS = 30_000
const GLOBAL_LOCK_PATH = fileURLToPath(
  new URL('../outputs/.crunchbase-api.lock', import.meta.url),
)

type CliOptions = {
  execute: boolean
  help: boolean
  maxRequests: number | undefined
  outputDir: string
}

type RequestBudget = {
  count: number
  lastRequestAt: number
  maximum: number
}

function usage() {
  return `Usage:
  pnpm export:yc-crunchbase-links [options]

Default behavior is a zero-network dry run. A live run requires both --execute
and an explicit hard request budget, preventing accidental Crunchbase usage.

Options:
      --execute                 Allow live Crunchbase API requests
      --max-requests <count>    Hard cap including retries; required with --execute
                                and cannot exceed ${MAX_REQUEST_BUDGET}
  -o, --output-dir <path>       Output directory (default: ${DEFAULT_OUTPUT_DIR})
  -h, --help                    Show this help

Authentication:
  Set ${API_KEY_ENV} in the environment. The key is sent only in the
  X-cb-user-key header and is never printed, persisted, or placed in a URL.

Outputs:
  yc-crunchbase-links.txt       One canonical Crunchbase URL per line
  yc-crunchbase-links.json      JSON array of canonical Crunchbase URLs
  yc-crunchbase-slugs.json      JSON array of organization permalinks
  manifest.json                 Counts and completeness metadata; no entity IDs

This query requires Crunchbase API access to Advanced Financials data.`
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function parseArgs(args: string[]): CliOptions {
  let execute = false
  let help = false
  let maxRequests: number | undefined
  let outputDir = resolve(DEFAULT_OUTPUT_DIR)

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--') {
      if (index !== args.length - 1) {
        throw new Error('This command does not accept positional arguments after --')
      }
      break
    }

    if (argument === '-h' || argument === '--help') {
      help = true
      continue
    }

    if (argument === '--execute') {
      execute = true
      continue
    }

    if (argument === '--max-requests') {
      const value = Number(requireValue(args, index, argument))
      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > MAX_REQUEST_BUDGET
      ) {
        throw new Error(
          `--max-requests must be between 1 and ${MAX_REQUEST_BUDGET}`,
        )
      }
      maxRequests = value
      index += 1
      continue
    }

    if (argument === '-o' || argument === '--output-dir') {
      outputDir = resolve(requireValue(args, index, argument))
      index += 1
      continue
    }

    throw new Error(`Unknown option: ${argument}`)
  }

  if (execute && maxRequests === undefined) {
    throw new Error('--execute requires --max-requests to cap Crunchbase usage')
  }
  if (!execute && maxRequests !== undefined) {
    throw new Error('--max-requests is only valid with --execute')
  }

  return { execute, help, maxRequests, outputDir }
}

function buildRequestBody(afterId: string | undefined) {
  return {
    field_ids: ['funded_organization_identifier'],
    query: [
      {
        field_id: 'investor_identifiers',
        operator_id: 'includes',
        type: 'predicate',
        values: [INVESTOR_NAME],
      },
    ],
    order: [
      {
        field_id: 'announced_on',
        nulls: 'last',
        sort: 'asc',
      },
    ],
    limit: PAGE_SIZE,
    ...(afterId ? { after_id: afterId } : {}),
  }
}

function wait(milliseconds: number) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  )
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      const delay = seconds * 1_000
      if (delay > MAX_RETRY_WAIT_MS) {
        throw new Error(
          `Crunchbase requested a retry after ${seconds} seconds; stopped instead of shortening it`,
        )
      }
      return delay
    }
    const retryDate = Date.parse(retryAfter)
    if (Number.isFinite(retryDate)) {
      const delay = Math.max(0, retryDate - Date.now())
      if (delay > MAX_RETRY_WAIT_MS) {
        throw new Error(
          'Crunchbase requested a long Retry-After delay; stopped instead of retrying early',
        )
      }
      return delay
    }
  }
  const maximum = Math.min(1_000 * 2 ** (attempt - 1), 8_000)
  return Math.floor(Math.random() * (maximum + 1))
}

async function requestPage(
  afterId: string | undefined,
  apiKey: string,
  budget: RequestBudget,
) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PAGE; attempt += 1) {
    if (budget.count >= budget.maximum) {
      throw new Error(
        `Stopped at the approved Crunchbase request cap (${budget.maximum})`,
      )
    }

    const sinceLastRequest = Date.now() - budget.lastRequestAt
    if (sinceLastRequest < REQUEST_INTERVAL_MS) {
      await wait(REQUEST_INTERVAL_MS - sinceLastRequest)
    }

    budget.count += 1
    budget.lastRequestAt = Date.now()
    const response = await fetch(API_ENDPOINT, {
      body: JSON.stringify(buildRequestBody(afterId)),
      headers: {
        'Content-Type': 'application/json',
        'X-cb-user-key': apiKey,
      },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.ok) {
      return response.json() as Promise<unknown>
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Crunchbase rejected API access (${response.status}); stopped without retrying`,
      )
    }

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === MAX_ATTEMPTS_PER_PAGE) {
      throw new Error(
        `Crunchbase API request failed with status ${response.status}`,
      )
    }

    await wait(retryDelay(response, attempt))
  }

  throw new Error('Crunchbase API request failed')
}

async function preflightOutputDirectory(outputDir: string) {
  await mkdir(outputDir, { recursive: true })
  const probePath = join(outputDir, `.write-probe-${process.pid}`)
  const probe = await open(probePath, 'wx')
  try {
    await probe.writeFile('quota-safe preflight\n', 'utf8')
  } finally {
    await probe.close()
    await unlink(probePath).catch(() => undefined)
  }
}

async function acquireGlobalLock() {
  await mkdir(dirname(GLOBAL_LOCK_PATH), { recursive: true })
  let lock
  try {
    lock = await open(GLOBAL_LOCK_PATH, 'wx')
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EEXIST'
    ) {
      throw new Error(
        `Another Crunchbase API export may be running; lock: ${GLOBAL_LOCK_PATH}`,
      )
    }
    throw error
  }
  try {
    await lock.writeFile(
      `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
      'utf8',
    )
  } catch (error) {
    await lock.close().catch(() => undefined)
    await unlink(GLOBAL_LOCK_PATH).catch(() => undefined)
    throw error
  }

  return async () => {
    await lock.close()
    await unlink(GLOBAL_LOCK_PATH).catch(() => undefined)
  }
}

async function writeOutputs(
  outputDir: string,
  result: ReturnType<PortfolioLinkCollector['finish']>,
  metadata: {
    completedAt: string
    pageCount: number
    approvedRequestCap: number
    requestCount: number
    sourceCount: number | undefined
  },
) {
  const urls = result.links.map((link) => link.url)
  const slugs = result.links.map((link) => link.slug)
  const generationName = `run-${metadata.completedAt.replace(/[:.]/g, '-')}`
  const generationDir = join(outputDir, generationName)
  const stagingDir = join(
    outputDir,
    `.staging-${generationName}-${process.pid}`,
  )
  const manifest = {
    schemaVersion: 1,
    scope:
      'Distinct Crunchbase organizations returned by the exact Y Combinator investor-name filter on funding rounds.',
    completedAt: metadata.completedAt,
    source: {
      provider: 'Crunchbase API',
      endpoint: API_ENDPOINT,
      investor: INVESTOR_NAME,
      pageSize: PAGE_SIZE,
    },
    completeness: {
      sourceReportedFundingRoundCount: metadata.sourceCount,
      fetchedFundingRoundCount: result.stats.membershipRows,
      uniqueFundingRoundCount: result.stats.uniqueFundingRounds,
      uniqueOrganizationCount: result.stats.uniqueOrganizations,
      additionalFundingRoundRowsForExistingOrganizations:
        result.stats.additionalFundingRoundRowsForExistingOrganizations,
      missingOrganizationIdentifiers: result.stats.missingOrganizationRows,
      observedPermalinkChanges: result.stats.permalinkChanges,
      pageCount: metadata.pageCount,
      approvedRequestCap: metadata.approvedRequestCap,
      requestCountIncludingRetries: metadata.requestCount,
    },
    outputs: {
      linksJson: 'yc-crunchbase-links.json',
      linksText: 'yc-crunchbase-links.txt',
      slugsJson: 'yc-crunchbase-slugs.json',
    },
  }

  await mkdir(stagingDir)
  try {
    await Promise.all([
      writeFile(
        join(stagingDir, 'yc-crunchbase-links.txt'),
        `${urls.join('\n')}\n`,
        'utf8',
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-links.json'),
        `${JSON.stringify(urls, null, 2)}\n`,
        'utf8',
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-slugs.json'),
        `${JSON.stringify(slugs, null, 2)}\n`,
        'utf8',
      ),
      writeFile(
        join(stagingDir, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8',
      ),
    ])
    await rename(stagingDir, generationDir)
  } catch (error) {
    await rm(stagingDir, { force: true, recursive: true })
    throw error
  }

  return generationDir
}

async function executeExport(options: CliOptions) {
  const apiKey = process.env[API_KEY_ENV]?.trim()
  if (!apiKey) {
    throw new Error(`${API_KEY_ENV} is required for an approved live run`)
  }

  const maximum = options.maxRequests
  if (maximum === undefined) {
    throw new Error('A live request budget is required')
  }

  const releaseLock = await acquireGlobalLock()
  try {
    await preflightOutputDirectory(options.outputDir)

    const budget: RequestBudget = {
      count: 0,
      lastRequestAt: 0,
      maximum,
    }
    const collector = new PortfolioLinkCollector()
    const seenCursors = new Set<string>()
    let afterId: string | undefined
    let pageCount = 0
    let sourceCount: number | undefined

    while (true) {
      const payload = await requestPage(afterId, apiKey, budget)
      const page = parseFundingRoundPage(payload)
      pageCount += 1

      if (sourceCount !== undefined && sourceCount !== page.totalCount) {
        throw new Error('Crunchbase source count changed during pagination')
      }
      sourceCount = page.totalCount
      if (sourceCount > MAX_SOURCE_ROWS) {
        throw new Error(
          `Crunchbase reported ${sourceCount} rows, exceeding the safety ceiling of ${MAX_SOURCE_ROWS}`,
        )
      }

      const minimumPages = Math.ceil(sourceCount / PAGE_SIZE)
      const retriesAlreadyUsed = budget.count - pageCount
      const minimumTotalRequests = minimumPages + retriesAlreadyUsed
      if (minimumTotalRequests > maximum) {
        throw new Error(
          `Completion now requires at least ${minimumTotalRequests} requests, exceeding the approved cap of ${maximum}`,
        )
      }

      collector.add(page)
      const progress = collector.finish().stats.membershipRows
      console.log(
        `Page ${pageCount}: ${page.entityCount} funding rounds (${progress}/${sourceCount})`,
      )

      if (page.entityCount === 0 || progress >= sourceCount) {
        break
      }

      if (!page.cursor || seenCursors.has(page.cursor)) {
        throw new Error('Crunchbase pagination cursor did not advance')
      }
      seenCursors.add(page.cursor)
      afterId = page.cursor
    }

    const result = collector.finish()
    if (result.stats.membershipRows !== sourceCount) {
      throw new Error(
        `Incomplete export: fetched ${result.stats.membershipRows} of ${sourceCount} funding rounds`,
      )
    }
    if (result.stats.uniqueFundingRounds !== sourceCount) {
      throw new Error(
        `Incomplete export: ${result.stats.uniqueFundingRounds} unique funding rounds for a source count of ${sourceCount}`,
      )
    }
    if (result.stats.missingOrganizationRows > 0) {
      throw new Error(
        `Incomplete export: ${result.stats.missingOrganizationRows} funding rounds lack a complete organization identifier`,
      )
    }
    if (result.links.length === 0) {
      throw new Error('Crunchbase returned no Y Combinator organization links')
    }

    const generationDir = await writeOutputs(options.outputDir, result, {
      approvedRequestCap: maximum,
      completedAt: new Date().toISOString(),
      pageCount,
      requestCount: budget.count,
      sourceCount,
    })

    console.log(`Unique Crunchbase organizations: ${result.links.length}`)
    console.log(`Requests used: ${budget.count}/${maximum}`)
    console.log(`Output: ${generationDir}`)
  } finally {
    await releaseLock()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  if (!options.execute) {
    console.log('Dry run only: no Crunchbase request was made.')
    console.log(`Endpoint: ${API_ENDPOINT}`)
    console.log(`Filter: funding rounds that include ${INVESTOR_NAME}`)
    console.log(`Page size: ${PAGE_SIZE}`)
    console.log('A live run requires explicit approval, --execute, and --max-requests.')
    return
  }

  await executeExport(options)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
