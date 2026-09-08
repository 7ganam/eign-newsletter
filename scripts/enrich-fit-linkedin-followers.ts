import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { UnifiedPeopleFile, UnifiedPerson, UnifiedProfile } from '../src/unifiedPeopleTypes'
import {
  fetchLinkedInFollowers,
  type BrowserChoice,
} from './get-linkedin-followers'
import {
  parseLinkedInProfileUrl,
  type LinkedInFollowerResult,
} from './lib/linkedin-followers'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const PEOPLE_FILE = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const DEFAULT_MANIFEST = resolve(
  PROJECT_ROOT,
  'outputs/linkedin/fit-missing-followers-by-name-manifest.json',
)

type ManifestStatus = 'failed' | 'pending' | 'success'

type ManifestEntry = {
  attempts: number
  error?: string
  failedAt?: string
  key: string
  lastAttemptAt?: string
  personIds: string[]
  personNames: string[]
  result?: LinkedInFollowerResult
  status: ManifestStatus
  succeededAt?: string
  uiPosition: number
  url: string
}

type FollowerManifest = {
  browser: BrowserChoice
  createdAt: string
  eligibility: 'fit-with-linkedin-and-missing-follower-count'
  entries: ManifestEntry[]
  order: 'unified-people-ui-name-ascending'
  sourceFile: string
  updatedAt: string
  version: 1
}

type CliOptions = {
  apply: boolean
  applyEach: boolean
  batchDelayMs: number
  batchSize?: number
  browser: BrowserChoice
  help: boolean
  limit?: number
  manifestPath: string
  maxAttempts: number
  requestDelayMs: number
  requestJitterMs: number
  retryDelayMs: number
  start: number
  timeoutMs: number
}

function usage() {
  return `Usage:
  pnpm linkedin:followers:fit [options]

Options:
      --apply                Write successful snapshots to unified-people.json
      --apply-each           Apply validated snapshots after every successful profile
      --browser <name>       edge (default), brave, or chrome
      --manifest <path>      Resume manifest (default: outputs/linkedin/fit-followers-manifest.json)
      --start <number>       First 1-based person in name order (default: 1)
      --limit <number>       Maximum people in this run
      --max-attempts <n>     Total attempts per profile across resumed runs (default: 1)
      --request-delay <ms>   Pause between profiles (default: 1000)
      --request-jitter <ms>  Add a random 0..N ms to each request delay
      --batch-size <n>       Profiles per batch before a cooldown
      --batch-delay <ms>     Cooldown between batches (default: 0)
      --retry-delay <ms>     Pause before a retry (default: 10000)
      --timeout <ms>         Per-profile wait timeout (default: 12000)
  -h, --help                 Show this help

The candidate set is restricted to people with influence.fit === true, an
existing LinkedIn profile, and no follower count. People are traversed in the
same ascending name order as the Fit-filtered Unified People UI. Each manifest
entry records its 1-based position in that full UI list, so excluded rows remain
auditable. Results are checkpointed after each profile.
Apply re-reads the people file and updates only records that are still Fit,
still missing a follower count, and still contain the same LinkedIn URL.`
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`)
  return value
}

function positiveInteger(args: string[], index: number, flag: string) {
  const value = Number(requireValue(args, index, flag))
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${flag} must be a positive integer`)
  }
  return value
}

function nonNegativeInteger(args: string[], index: number, flag: string) {
  const value = Number(requireValue(args, index, flag))
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative integer`)
  }
  return value
}

function parseArgs(args: string[]): CliOptions {
  let apply = false
  let applyEach = false
  let batchDelayMs = 0
  let batchSize: number | undefined
  let browser: BrowserChoice = 'edge'
  let help = false
  let limit: number | undefined
  let manifestPath = DEFAULT_MANIFEST
  let maxAttempts = 1
  let requestDelayMs = 1_000
  let requestJitterMs = 0
  let retryDelayMs = 10_000
  let start = 1
  let timeoutMs = 12_000

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '-h' || argument === '--help') {
      help = true
      continue
    }
    if (argument === '--apply') {
      apply = true
      continue
    }
    if (argument === '--apply-each') {
      applyEach = true
      continue
    }
    if (argument === '--browser') {
      const value = requireValue(args, index, argument)
      if (!['brave', 'chrome', 'edge'].includes(value)) {
        throw new Error('--browser must be edge, brave, or chrome')
      }
      browser = value as BrowserChoice
      index += 1
      continue
    }
    if (argument === '--manifest') {
      manifestPath = resolve(requireValue(args, index, argument))
      index += 1
      continue
    }
    if (argument === '--start' || argument === '--limit' || argument === '--max-attempts' || argument === '--batch-size') {
      const value = positiveInteger(args, index, argument)
      if (argument === '--start') start = value
      else if (argument === '--limit') limit = value
      else if (argument === '--max-attempts') maxAttempts = value
      else batchSize = value
      index += 1
      continue
    }
    if (argument === '--request-delay' || argument === '--request-jitter' || argument === '--retry-delay' || argument === '--batch-delay') {
      const value = nonNegativeInteger(args, index, argument)
      if (argument === '--request-delay') requestDelayMs = value
      else if (argument === '--request-jitter') requestJitterMs = value
      else if (argument === '--retry-delay') retryDelayMs = value
      else batchDelayMs = value
      index += 1
      continue
    }
    if (argument === '--timeout') {
      timeoutMs = positiveInteger(args, index, argument)
      if (timeoutMs < 1_000) throw new Error('--timeout must be at least 1000 milliseconds')
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${argument}`)
  }

  return {
    apply,
    applyEach,
    batchDelayMs,
    batchSize,
    browser,
    help,
    limit,
    manifestPath,
    maxAttempts,
    requestDelayMs,
    requestJitterMs,
    retryDelayMs,
    start,
    timeoutMs,
  }
}

function canonicalLinkedInUrl(value: string) {
  return parseLinkedInProfileUrl(value).canonicalUrl
}

function collectCandidates(data: UnifiedPeopleFile) {
  const candidates: Array<{
    key: string
    personIds: string[]
    personNames: string[]
    uiPosition: number
    url: string
  }> = []
  const uiOrderedFitPeople = data.people
    .filter((person) => person.influence.fit === true)
    .sort((left, right) =>
      left.name.display.localeCompare(right.name.display, undefined, {
        numeric: true,
        sensitivity: 'base',
      }) || left.name.display.localeCompare(right.name.display))

  for (const [index, person] of uiOrderedFitPeople.entries()) {
    for (const profile of person.profiles) {
      if (profile.platform !== 'linkedin' || !profile.url) continue
      if (profile.followers?.count != null) continue
      const url = canonicalLinkedInUrl(profile.url)
      candidates.push({
        key: `${person.id}\t${url}`,
        personIds: [person.id],
        personNames: [person.name.display],
        uiPosition: index + 1,
        url,
      })
    }
  }
  return candidates
}

async function readManifest(path: string): Promise<FollowerManifest | undefined> {
  try {
    const manifest = JSON.parse(await readFile(path, 'utf8')) as FollowerManifest
    if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
      throw new Error('Unsupported LinkedIn follower manifest')
    }
    return manifest
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function writeJsonAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.${process.pid}.tmp`
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function writeManifest(path: string, manifest: FollowerManifest) {
  manifest.updatedAt = new Date().toISOString()
  await writeJsonAtomically(path, manifest)
}

function mergeManifest(
  existing: FollowerManifest | undefined,
  browser: BrowserChoice,
  candidates: ReturnType<typeof collectCandidates>,
): FollowerManifest {
  const existingByKey = new Map(existing?.entries.map((entry) => [
    entry.key ?? `${entry.personIds[0]}\t${entry.url}`,
    entry,
  ]))
  const now = new Date().toISOString()
  return {
    browser,
    createdAt: existing?.createdAt ?? now,
    eligibility: 'fit-with-linkedin-and-missing-follower-count',
    entries: candidates.map((candidate) => {
      const previous = existingByKey.get(candidate.key)
      return {
        attempts: previous?.attempts ?? 0,
        ...(previous?.error ? { error: previous.error } : {}),
        ...(previous?.failedAt ? { failedAt: previous.failedAt } : {}),
        ...(previous?.lastAttemptAt ? { lastAttemptAt: previous.lastAttemptAt } : {}),
        key: candidate.key,
        personIds: candidate.personIds,
        personNames: candidate.personNames,
        ...(previous?.result ? { result: previous.result } : {}),
        status: previous?.status ?? 'pending',
        ...(previous?.succeededAt ? { succeededAt: previous.succeededAt } : {}),
        uiPosition: candidate.uiPosition,
        url: candidate.url,
      }
    }),
    order: 'unified-people-ui-name-ascending',
    sourceFile: 'assets/people/unified-people.json',
    updatedAt: now,
    version: 1,
  }
}

const sleep = (milliseconds: number) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds)
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isFatalBrowserFailure(message: string) {
  return /not logged in|security or restriction|JavaScript from Apple Events|AppleScript is turned off/i.test(message)
}

const NAME_STOP_WORDS = new Set([
  'al', 'el', 'bin', 'bint', 'dr', 'e', 'h', 'he', 'her', 'his', 'mr', 'mrs', 'ms', 'msc', 'princess', 'prof',
])

const ABDALLAH_TRANSLITERATIONS = new Set(['abdallah', 'abdullah'])

function nameTokenMatches(expected: string, observed: string) {
  if (expected === observed) return true
  return ABDALLAH_TRANSLITERATIONS.has(expected) && ABDALLAH_TRANSLITERATIONS.has(observed)
}

function nameTokens(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !NAME_STOP_WORDS.has(token))
}

function namesLikelyMatch(expected: string, observed: string) {
  const expectedTokens = nameTokens(expected)
  const observedTokens = new Set(nameTokens(observed))
  if (!expectedTokens.length || !observedTokens.size) return false
  if (expectedTokens.length === 1) {
    return [...observedTokens].some((token) => nameTokenMatches(expectedTokens[0], token))
  }
  return [...observedTokens].some((token) => nameTokenMatches(expectedTokens[0], token)) &&
    [...observedTokens].some((token) => nameTokenMatches(
      expectedTokens[expectedTokens.length - 1],
      token,
    ))
}

function integrityHash(data: UnifiedPeopleFile, field: 'fit' | 'sources') {
  const value = data.people.map((person) => field === 'fit'
    ? [person.id, person.influence.fit]
    : [person.id, person.source_records])
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function matchingLinkedInProfile(person: UnifiedPerson, url: string): UnifiedProfile | undefined {
  return person.profiles.find((profile) => {
    if (profile.platform !== 'linkedin' || !profile.url) return false
    try {
      return canonicalLinkedInUrl(profile.url) === url
    } catch {
      return false
    }
  })
}

async function applySuccessfulResults(
  manifest: FollowerManifest,
  peopleFile: string,
) {
  const currentData = JSON.parse(await readFile(peopleFile, 'utf8')) as UnifiedPeopleFile
  const sourceHashBefore = integrityHash(currentData, 'sources')
  const fitHashBefore = integrityHash(currentData, 'fit')
  const successfulEntries = manifest.entries.filter(
    (entry): entry is ManifestEntry & { result: LinkedInFollowerResult } =>
      entry.status === 'success' && Boolean(entry.result),
  )

  let updatedProfiles = 0
  let skippedAlreadyPopulated = 0
  let skippedIdentityMismatch = 0
  let skippedNoLongerFit = 0
  let skippedUrlChanged = 0
  const updatedPeople = new Set<string>()

  for (const entry of successfulEntries) {
    for (const snapshotPersonId of entry.personIds) {
      const person = currentData.people.find((candidate) => candidate.id === snapshotPersonId)
      if (!person || person.influence.fit !== true) {
        skippedNoLongerFit += 1
        continue
      }
      const profile = matchingLinkedInProfile(person, entry.url)
      if (!profile) {
        skippedUrlChanged += 1
        continue
      }
      if (profile.followers?.count != null) {
        skippedAlreadyPopulated += 1
        continue
      }
      if (!namesLikelyMatch(person.name.display, entry.result.profileName)) {
        skippedIdentityMismatch += 1
        continue
      }
      profile.followers = {
        count: entry.result.followers.count,
        observed_at: entry.result.observedAt.slice(0, 10),
        status: 'observed',
        precision: entry.result.followers.precision,
        source: 'linkedin-profile',
      }
      updatedPeople.add(person.id)
      updatedProfiles += 1
    }
  }

  if (integrityHash(currentData, 'sources') !== sourceHashBefore) {
    throw new Error('Source provenance changed while applying follower snapshots')
  }
  if (integrityHash(currentData, 'fit') !== fitHashBefore) {
    throw new Error('Fit flags changed while applying follower snapshots')
  }

  if (updatedProfiles) {
    currentData.generated_at = new Date().toISOString()
    await writeJsonAtomically(peopleFile, currentData)
  }

  return {
    fitHashBefore,
    skippedAlreadyPopulated,
    skippedIdentityMismatch,
    skippedNoLongerFit,
    skippedUrlChanged,
    sourceHashBefore,
    updatedPeople: updatedPeople.size,
    updatedProfiles,
  }
}

async function entryIsStillEligible(entry: ManifestEntry, peopleFile: string) {
  const currentData = JSON.parse(await readFile(peopleFile, 'utf8')) as UnifiedPeopleFile
  const person = currentData.people.find((candidate) => candidate.id === entry.personIds[0])
  if (!person || person.influence.fit !== true) return false
  const profile = matchingLinkedInProfile(person, entry.url)
  return Boolean(profile && profile.followers?.count == null)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const sourceData = JSON.parse(await readFile(PEOPLE_FILE, 'utf8')) as UnifiedPeopleFile
  const candidates = collectCandidates(sourceData)
  const existingManifest = await readManifest(options.manifestPath)
  const manifest = mergeManifest(existingManifest, options.browser, candidates)
  await writeManifest(options.manifestPath, manifest)

  const selectedEntries = manifest.entries.slice(
    options.start - 1,
    options.limit ? options.start - 1 + options.limit : undefined,
  )
  let fatalFailure: string | undefined
  let processed = 0
  let requestsMade = 0

  console.log(`SCOPE\tfitPeople=${sourceData.people.filter((person) => person.influence.fit === true).length}\tmissingFollowerPeople=${manifest.entries.length}\tselected=${selectedEntries.length}\torder=unified-people-ui-name-ascending\tfirstUiPosition=${manifest.entries[0]?.uiPosition ?? 'none'}\tfirstEligible=${manifest.entries[0]?.personNames[0] ?? 'none'}`)

  for (const entry of selectedEntries) {
    processed += 1
    if (entry.status === 'success' && entry.result) {
      console.log(`PROGRESS\t${processed}/${selectedEntries.length}\tCACHED\t${entry.personNames.join(' | ')}\t${entry.result.followers.count}`)
      continue
    }
    if (entry.attempts >= options.maxAttempts) {
      console.log(`PROGRESS\t${processed}/${selectedEntries.length}\tFAILED_CACHED\t${entry.personNames.join(' | ')}`)
      continue
    }
    if (!await entryIsStillEligible(entry, PEOPLE_FILE)) {
      console.log(`PROGRESS\t${processed}/${selectedEntries.length}\tSKIPPED_INELIGIBLE\t${entry.personNames.join(' | ')}`)
      continue
    }

    while (entry.attempts < options.maxAttempts) {
      requestsMade += 1
      entry.attempts += 1
      entry.lastAttemptAt = new Date().toISOString()
      entry.status = 'pending'
      delete entry.error
      delete entry.failedAt
      await writeManifest(options.manifestPath, manifest)

      try {
        const result = await fetchLinkedInFollowers(entry.url, {
          browser: options.browser,
          // Reuse one hidden browser window for the whole batch. Creating a new
          // window for every profile can briefly surface Edge and steal focus.
          keepOpen: true,
          timeoutMs: options.timeoutMs,
        })
        entry.result = result
        entry.status = 'success'
        entry.succeededAt = new Date().toISOString()
        delete entry.error
        delete entry.failedAt
        await writeManifest(options.manifestPath, manifest)
        console.log(`PROGRESS\t${processed}/${selectedEntries.length}\tSUCCESS\t${entry.personNames.join(' | ')}\t${result.followers.count}\t${result.followers.locations.join(',')}`)
        if (options.applyEach) {
          const incrementalApply = await applySuccessfulResults(manifest, PEOPLE_FILE)
          console.log(`APPLY\t${entry.personNames.join(' | ')}\tupdatedProfiles=${incrementalApply.updatedProfiles}\tidentityMismatch=${incrementalApply.skippedIdentityMismatch}\tnoLongerFit=${incrementalApply.skippedNoLongerFit}`)
        }
        break
      } catch (error) {
        const message = errorMessage(error)
        entry.error = message
        entry.failedAt = new Date().toISOString()
        entry.status = 'failed'
        await writeManifest(options.manifestPath, manifest)
        console.error(`PROGRESS\t${processed}/${selectedEntries.length}\tFAILED\t${entry.personNames.join(' | ')}\t${message}`)
        if (isFatalBrowserFailure(message)) {
          fatalFailure = message
          break
        }
        if (entry.attempts < options.maxAttempts) await sleep(options.retryDelayMs)
      }
    }

    if (fatalFailure) break
    if (
      options.batchSize &&
      options.batchDelayMs &&
      requestsMade > 0 &&
      requestsMade % options.batchSize === 0 &&
      processed < selectedEntries.length
    ) {
      console.log(`COOLDOWN\trequests=${requestsMade}\tdelayMs=${options.batchDelayMs}`)
      await sleep(options.batchDelayMs)
    } else if (processed < selectedEntries.length && (options.requestDelayMs || options.requestJitterMs)) {
      const jitter = options.requestJitterMs
        ? Math.floor(Math.random() * (options.requestJitterMs + 1))
        : 0
      await sleep(options.requestDelayMs + jitter)
    }
  }

  const applyResult = options.apply
    ? await applySuccessfulResults(manifest, PEOPLE_FILE)
    : null
  const summary = {
    apply: options.apply,
    applyResult,
    failed: manifest.entries.filter((entry) => entry.status === 'failed').length,
    fatalFailure: fatalFailure ?? null,
    manifestPath: options.manifestPath,
    pending: manifest.entries.filter((entry) => entry.status === 'pending').length,
    selected: selectedEntries.length,
    success: manifest.entries.filter((entry) => entry.status === 'success').length,
    totalMissingFollowerPeople: manifest.entries.length,
  }
  console.log(JSON.stringify(summary, null, 2))
  if (fatalFailure) throw new Error(fatalFailure)
}

await main()
