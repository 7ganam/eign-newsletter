import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { UnifiedPeopleFile, UnifiedPerson } from '../src/unifiedPeopleTypes'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const PEOPLE_FILE = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const SEARCH_ENDPOINT = 'https://search.brave.com/search'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'

const applyChanges = process.argv.includes('--apply')
const stringArg = (name: string) => process.argv
  .find((argument) => argument.startsWith(`--${name}=`))
  ?.slice(name.length + 3)
const numericArg = (name: string, fallback: number) => {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1]
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}
const offset = numericArg('offset', 0)
const limit = numericArg('limit', Number.MAX_SAFE_INTEGER)
const concurrency = Math.max(1, Math.min(6, numericArg('concurrency', 3)))
const matchesFile = stringArg('matches-file')

type SearchResult = {
  title: string
  fullTitle: string
  description: string
  url: string
}

type Match = {
  personId: string
  personName: string
  query: string
  url: string
  title: string
  evidence: string
}

const decodeJsString = (value: string) => {
  try {
    return JSON.parse(`"${value}"`) as string
  } catch {
    return value
  }
}

const stripMarkup = (value: string) => value
  .replace(/\\u003C\/?strong>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()

const canonicalLinkedInUrl = (value: string) => {
  try {
    const url = new URL(value)
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (pathParts[0]?.toLocaleLowerCase() !== 'in' || !pathParts[1]) return null
    return `https://www.linkedin.com/in/${pathParts[1]}`
  } catch {
    return null
  }
}

const parseSearchResults = (html: string): SearchResult[] => {
  const results: SearchResult[] = []
  const seen = new Set<string>()
  for (const chunk of html.split('{title:"').slice(1)) {
    const title = chunk.match(/^((?:\\.|[^"\\])*)"/)?.[1]
    const url = chunk.match(/url:"((?:https:\/\/)?(?:[a-z]{2}\.)?(?:www\.)?linkedin\.com\/in\/(?:\\.|[^"\\])*)"/)?.[1]
    const fullTitle = chunk.match(/full_title:"((?:\\.|[^"\\])*)"/)?.[1] ?? ''
    const description = chunk.match(/description:"((?:\\.|[^"\\])*)"/)?.[1] ?? ''
    if (!title || !url) continue
    const canonicalUrl = canonicalLinkedInUrl(decodeJsString(url))
    if (!canonicalUrl || seen.has(canonicalUrl)) continue
    seen.add(canonicalUrl)
    results.push({
      title: stripMarkup(decodeJsString(title)),
      fullTitle: stripMarkup(decodeJsString(fullTitle)),
      description: stripMarkup(decodeJsString(description)),
      url: canonicalUrl,
    })
  }
  return results
}

const normalise = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f\u200e\u200f\u202a-\u202e]/g, '')
  .toLocaleLowerCase()
  .replace(/\b(?:dr|prof|professor|phd|mba|msc|mr|mrs|ms)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const tokens = (value: string) => normalise(value).split(/\s+/).filter(Boolean)
const NAME_CONNECTORS = new Set(['al', 'el', 'bin', 'bint', 'ibn', 'de', 'la', 'le'])
const ORGANISATION_STOP_WORDS = new Set([
  'and', 'company', 'corporation', 'for', 'group', 'holding', 'international', 'middle', 'east',
  'ministry', 'national', 'of', 'saudi', 'services', 'solutions', 'technologies', 'technology', 'the',
])
const ROLE_STOP_WORDS = new Set(['and', 'chief', 'director', 'general', 'head', 'manager', 'of', 'officer', 'senior', 'sr', 'the', 'vice'])

const containsMeaningfulName = (targetName: string, resultTitle: string) => {
  const target = tokens(targetName).filter((token) => token.length > 2 || !NAME_CONNECTORS.has(token))
  const resultName = tokens(resultTitle.split(/\s[-–|]\s/)[0] ?? resultTitle)
  if (target.length < 2) return false
  return target.every((token) => resultName.includes(token))
}

const evidenceMatches = (value: string | null, evidence: string, stopWords: Set<string>, requiredMatches: number) => {
  if (!value) return false
  const evidenceTokens = new Set(tokens(evidence))
  const meaningful = [...new Set(tokens(value).filter((token) => token.length >= 3 && !stopWords.has(token)))]
  if (!meaningful.length) return false
  return meaningful.filter((token) => evidenceTokens.has(token)).length >= Math.min(requiredMatches, meaningful.length)
}

const matchResult = (person: UnifiedPerson, result: SearchResult) => {
  if (!containsMeaningfulName(person.name.display, result.title)) return false
  const evidence = `${result.fullTitle} ${result.title} ${result.description}`
  const organisationMatch = evidenceMatches(person.current_role.organization, evidence, ORGANISATION_STOP_WORDS, 1)
  const roleMatch = evidenceMatches(person.current_role.title, evidence, ROLE_STOP_WORDS, 2)
  return organisationMatch || roleMatch
}

const searchQuery = (person: UnifiedPerson) => {
  const identity = [person.current_role.organization, person.current_role.title].find(Boolean)
  return `site:linkedin.com/in "${person.name.display}"${identity ? ` "${identity}"` : ''}`
}

const searchPerson = async (person: UnifiedPerson): Promise<Match | null> => {
  const query = searchQuery(person)
  const url = new URL(SEARCH_ENDPOINT)
  url.searchParams.set('q', query)
  url.searchParams.set('source', 'web')
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Search returned ${response.status}`)
  const html = await response.text()
  const results = parseSearchResults(html)
  const result = results.find((candidate) => matchResult(person, candidate))
  if (!result) return null
  return {
    personId: person.id,
    personName: person.name.display,
    query,
    url: result.url,
    title: result.title,
    evidence: result.description,
  }
}

const hasLinkedIn = (person: UnifiedPerson) => person.profiles.some(
  (profile) => profile.platform === 'linkedin' && Boolean(profile.url),
)

const sourceData = JSON.parse(await readFile(PEOPLE_FILE, 'utf8')) as UnifiedPeopleFile
const candidates = sourceData.people
  .filter((person) => person.influence.fit === true && !hasLinkedIn(person))
  .slice(offset, offset + limit)

const matches: Match[] = []
let searched = 0
let failed = 0

if (matchesFile) {
  const imported = JSON.parse(await readFile(resolve(PROJECT_ROOT, matchesFile), 'utf8')) as Array<{
    id: string
    name: string
    organization: string
    url: string
  }>
  const candidateIds = new Set(candidates.map((person) => person.id))
  for (const importedMatch of imported) {
    const person = sourceData.people.find((candidate) => candidate.id === importedMatch.id)
    const url = canonicalLinkedInUrl(importedMatch.url)
    if (!person || !candidateIds.has(person.id) || !url) continue
    matches.push({
      personId: person.id,
      personName: person.name.display,
      query: searchQuery(person),
      url,
      title: `${person.name.display} - ${person.current_role.organization ?? ''}`,
      evidence: `Imported high-confidence name and organization match for ${importedMatch.organization}`,
    })
  }
} else {
  for (let index = 0; index < candidates.length; index += concurrency) {
    const batch = candidates.slice(index, index + concurrency)
    const outcomes = await Promise.all(batch.map(async (person) => {
      try {
        return await searchPerson(person)
      } catch (error) {
        failed += 1
        console.error(`SEARCH_FAILED\t${person.id}\t${error instanceof Error ? error.message : String(error)}`)
        return null
      }
    }))
    searched += batch.length
    for (const match of outcomes) {
      if (!match) continue
      matches.push(match)
      console.log(`MATCH\t${match.personId}\t${match.personName}\t${match.url}\t${match.title}`)
    }
    if (searched % 24 === 0 || searched === candidates.length) {
      console.log(`PROGRESS\t${searched}/${candidates.length}\tmatches=${matches.length}\tfailed=${failed}`)
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 220))
  }
}

let added = 0
let skippedNoLongerFit = 0
let skippedAlreadyResolved = 0
let skippedDuplicateUrl = 0

if (applyChanges && matches.length) {
  const currentData = JSON.parse(await readFile(PEOPLE_FILE, 'utf8')) as UnifiedPeopleFile
  const usedUrls = new Map(currentData.people.flatMap((person) => person.profiles.map((profile) => [
    canonicalLinkedInUrl(profile.url),
    person.id,
  ] as const)).filter(([url]) => Boolean(url)))

  for (const match of matches) {
    const person = currentData.people.find((candidate) => candidate.id === match.personId)
    if (!person || person.influence.fit !== true) {
      skippedNoLongerFit += 1
      continue
    }
    if (hasLinkedIn(person)) {
      skippedAlreadyResolved += 1
      continue
    }
    const existingOwner = usedUrls.get(match.url)
    if (existingOwner && existingOwner !== person.id) {
      skippedDuplicateUrl += 1
      continue
    }
    person.profiles.push({
      platform: 'linkedin',
      url: match.url,
      verification: 'ai-fetched',
      followers: null,
    })
    usedUrls.set(match.url, person.id)
    added += 1
  }

  if (added) {
    currentData.generated_at = new Date().toISOString()
    const tempPath = `${PEOPLE_FILE}.${process.pid}.tmp`
    try {
      await writeFile(tempPath, `${JSON.stringify(currentData, null, 2)}\n`, 'utf8')
      await rename(tempPath, PEOPLE_FILE)
    } catch (error) {
      await unlink(tempPath).catch(() => undefined)
      throw error
    }
  }
}

console.log(JSON.stringify({
  applyChanges,
  matchesFile: matchesFile ?? null,
  offset,
  candidates: candidates.length,
  searched,
  failed,
  highConfidenceMatches: matches.length,
  added,
  skippedNoLongerFit,
  skippedAlreadyResolved,
  skippedDuplicateUrl,
}, null, 2))
