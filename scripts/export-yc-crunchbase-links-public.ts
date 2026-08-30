import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  buildPublicLinkDataset,
  canonicalizeCrunchbaseOrganizationUrl,
  csvCell,
  parseCsv,
  parseCurrentYcCompanies,
  sha256,
  type CsvRecord,
  type PublicCrunchbaseLink,
  type YcCrunchbaseAuditRow,
} from './lib/public-yc-crunchbase-links'

const DEFAULT_OUTPUT_DIR = resolve('outputs/yc-crunchbase-links-public')
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 5 * 60_000
const DATAHIVE_COMMIT = 'b87ba8d6944993675bf5af3987782dfb299c4413'
const RADEMA_COMMIT = '34bf382b9d68f6d86a3cc371fcca2552d045c8d7'
const SOURCE_FILES = {
  datahive: {
    filename: 'yc-companies.csv',
    url: `https://huggingface.co/datasets/datahiveai/ycombinator-companies/resolve/${DATAHIVE_COMMIT}/yc-companies.csv?download=true`,
  },
  radema: {
    filename: 'radema-2024-05-11-yc-companies.csv',
    url: `https://raw.githubusercontent.com/radema/yc-scraper/${RADEMA_COMMIT}/data/2024-05-11-yc-companies.csv`,
  },
  ycOssAll: {
    filename: 'yc-oss-all.json',
    url: 'https://yc-oss.github.io/api/companies/all.json',
  },
  ycOssMeta: {
    filename: 'yc-oss-meta.json',
    url: 'https://yc-oss.github.io/api/meta.json',
  },
} as const
const STATIC_SOURCE_FILES = {
  commonCrawl: 'commoncrawl-CC-MAIN-2019-51-crunchbase-org.urls',
  kaggleStartups: 'kaggle-joebeachcapital-startups-v1/Startups.csv',
} as const
const ALLOWED_SOURCE_HOSTS = new Set([
  'huggingface.co',
  'raw.githubusercontent.com',
  'yc-oss.github.io',
])

type CliOptions = {
  help: boolean
  outputDir: string
  refreshSources: boolean
}

type RequestLog = {
  countByHostname: Record<string, number>
  redirectCount: number
}

type PublicLinkEvidence = PublicCrunchbaseLink & {
  provider: 'datahive' | 'kaggle_startups' | 'radema'
  sourceCompanyId: string
  sourceCompanyName: string
  sourceValue: string
}

type SourceEvidenceResult = {
  evidence: PublicLinkEvidence[]
  invalidNonemptyValues: number
}

function usage() {
  return `Usage:
  pnpm export:yc-crunchbase-links:public [options]

Builds YC Crunchbase link and candidate lists without contacting Crunchbase,
opening a browser, using an API key, or reading browser cookies. By default it
is fully offline and reads the public source snapshots already on disk.

Options:
      --refresh-sources     Refresh only the exact allowlisted YC/Hugging Face/GitHub files
  -o, --output-dir <path>  Output directory (default: outputs/yc-crunchbase-links-public)
  -h, --help               Show this help

Primary outputs:
  yc-crunchbase-links.txt           Publicly sourced links only
  yc-crunchbase-all-candidates.txt  Public links plus one inferred YC-slug candidate
  yc-crunchbase-audit.csv           Per-company identity/evidence audit
  manifest.json                     Counts, hashes, licenses, and safety attestation`
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function parseArgs(args: string[]): CliOptions {
  let help = false
  let outputDir = DEFAULT_OUTPUT_DIR
  let refreshSources = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '-h' || argument === '--help') {
      help = true
      continue
    }
    if (argument === '--refresh-sources') {
      refreshSources = true
      continue
    }
    if (argument === '-o' || argument === '--output-dir') {
      outputDir = resolve(requireValue(args, index, argument))
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${argument}`)
  }
  return { help, outputDir, refreshSources }
}

export function assertAllowedSourceUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !ALLOWED_SOURCE_HOSTS.has(url.hostname)) {
    throw new Error(`Refused non-allowlisted source URL: ${url.origin}`)
  }
  if (url.username || url.password) {
    throw new Error('Source URLs cannot contain credentials')
  }
  return url
}

async function downloadAllowed(
  sourceUrl: string,
  requestLog: RequestLog,
  redirectsRemaining = 5,
): Promise<Uint8Array> {
  const url = assertAllowedSourceUrl(sourceUrl)
  requestLog.countByHostname[url.hostname] =
    (requestLog.countByHostname[url.hostname] ?? 0) + 1
  const response = await fetch(url, {
    credentials: 'omit',
    headers: {
      Accept: 'application/json,text/csv,text/plain;q=0.9,*/*;q=0.1',
      'User-Agent': 'eign-public-yc-link-export/1.0',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (response.status >= 300 && response.status < 400) {
    if (redirectsRemaining === 0) {
      throw new Error(`Too many redirects while downloading ${url.hostname}`)
    }
    const location = response.headers.get('location')
    if (!location) {
      throw new Error(`Redirect from ${url.hostname} omitted Location`)
    }
    requestLog.redirectCount += 1
    return downloadAllowed(
      new URL(location, url).toString(),
      requestLog,
      redirectsRemaining - 1,
    )
  }
  if (!response.ok) {
    throw new Error(`Public source ${url.hostname} returned ${response.status}`)
  }

  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Public source exceeds ${MAX_DOWNLOAD_BYTES} bytes`)
  }
  if (!response.body) {
    throw new Error(`Public source ${url.hostname} returned no response body`)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    byteLength += value.byteLength
    if (byteLength > MAX_DOWNLOAD_BYTES) {
      await reader.cancel()
      throw new Error(`Public source exceeds ${MAX_DOWNLOAD_BYTES} bytes`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function refreshSources(sourceDir: string, requestLog: RequestLog) {
  await mkdir(sourceDir, { recursive: true })
  for (const source of Object.values(SOURCE_FILES)) {
    const bytes = await downloadAllowed(source.url, requestLog)
    const destination = join(sourceDir, source.filename)
    const temporary = `${destination}.download-${process.pid}`
    await writeFile(temporary, bytes)
    await rename(temporary, destination)
  }
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number | boolean>>) {
  return `${[
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n')}\n`
}

async function readSources(sourceDir: string) {
  const [
    commonCrawlBuffer,
    datahiveBuffer,
    kaggleBuffer,
    rademaBuffer,
    ycAllBuffer,
    ycMetaBuffer,
  ] = await Promise.all([
    readFile(join(sourceDir, STATIC_SOURCE_FILES.commonCrawl)),
    readFile(join(sourceDir, SOURCE_FILES.datahive.filename)),
    readFile(join(sourceDir, STATIC_SOURCE_FILES.kaggleStartups)),
    readFile(join(sourceDir, SOURCE_FILES.radema.filename)),
    readFile(join(sourceDir, SOURCE_FILES.ycOssAll.filename)),
    readFile(join(sourceDir, SOURCE_FILES.ycOssMeta.filename)),
  ])
  return {
    commonCrawlUrls: commonCrawlBuffer.toString('utf8'),
    datahiveRows: parseCsv(datahiveBuffer.toString('utf8')),
    hashes: {
      commonCrawl: sha256(commonCrawlBuffer),
      datahive: sha256(datahiveBuffer),
      kaggle: sha256(kaggleBuffer),
      radema: sha256(rademaBuffer),
      ycOssAll: sha256(ycAllBuffer),
      ycOssMeta: sha256(ycMetaBuffer),
    },
    kaggleRows: parseCsv(kaggleBuffer.toString('utf8')),
    rademaRows: parseCsv(rademaBuffer.toString('utf8')),
    ycAll: JSON.parse(ycAllBuffer.toString('utf8')) as unknown,
    ycMeta: JSON.parse(ycMetaBuffer.toString('utf8')) as unknown,
  }
}

function sourceEvidence(
  rows: CsvRecord[],
  fields: {
    companyId: string
    companyName: string
    provider: PublicLinkEvidence['provider']
    url: string
  },
  excludeCompanyIds = new Set<string>(),
): SourceEvidenceResult {
  const evidence: PublicLinkEvidence[] = []
  let invalidNonemptyValues = 0
  for (const row of rows) {
    const sourceCompanyId = row[fields.companyId]?.trim() ?? ''
    if (excludeCompanyIds.has(sourceCompanyId)) {
      continue
    }
    const sourceValue = row[fields.url]?.trim() ?? ''
    const link = canonicalizeCrunchbaseOrganizationUrl(sourceValue)
    if (sourceValue && !link) {
      invalidNonemptyValues += 1
    }
    if (!link) {
      continue
    }
    evidence.push({
      ...link,
      provider: fields.provider,
      sourceCompanyId,
      sourceCompanyName: row[fields.companyName]?.trim() ?? '',
      sourceValue,
    })
  }
  return { evidence, invalidNonemptyValues }
}

function uniqueLinks(evidence: PublicLinkEvidence[]) {
  const byUrl = new Map<string, PublicCrunchbaseLink>()
  for (const row of evidence) {
    byUrl.set(row.url, { slug: row.slug, url: row.url })
  }
  return [...byUrl.values()].sort((left, right) => left.url.localeCompare(right.url))
}

function verifyCanonicalLinks(links: PublicCrunchbaseLink[], label: string) {
  if (new Set(links.map((link) => link.url)).size !== links.length) {
    throw new Error(`Duplicate URLs remain in ${label}`)
  }
  for (const link of links) {
    const normalized = canonicalizeCrunchbaseOrganizationUrl(link.url)
    if (!normalized || normalized.url !== link.url || normalized.slug !== link.slug) {
      throw new Error(`Non-canonical URL in ${label}: ${link.url}`)
    }
  }
}

function compareAuditRows(left: YcCrunchbaseAuditRow, right: YcCrunchbaseAuditRow) {
  return (
    left.name.localeCompare(right.name) ||
    left.ycId.localeCompare(right.ycId, undefined, { numeric: true })
  )
}

function inferLinkFromCompanyName(name: string) {
  const slug = name
    .normalize('NFKD')
    .replaceAll('&', ' and ')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
  return canonicalizeCrunchbaseOrganizationUrl(slug)
}

function enrichAuditWithRadema(
  auditRows: YcCrunchbaseAuditRow[],
  rademaRows: CsvRecord[],
) {
  const byId = new Map(auditRows.map((row) => [row.ycId, row]))
  const conflicts: Array<{
    datahiveUrl: string
    name: string
    rademaUrl: string
    ycId: string
  }> = []

  for (const source of rademaRows) {
    const ycId = source.company_id?.trim() ?? ''
    if (!ycId || ycId === '64') {
      continue
    }
    const sourceValue = source.cb_url?.trim() ?? ''
    const link = canonicalizeCrunchbaseOrganizationUrl(sourceValue)
    const existing = byId.get(ycId)
    if (existing) {
      if (link && existing.linkStatus !== 'publicly_sourced') {
        existing.crunchbaseSlug = link.slug
        existing.crunchbaseUrl = link.url
        existing.evidence = sourceValue.includes('://')
          ? 'radema_cb_url'
          : 'radema_cb_slug'
        existing.linkStatus = 'publicly_sourced'
        existing.sourceValueIssue = ''
      } else if (
        link &&
        existing.linkStatus === 'publicly_sourced' &&
        existing.crunchbaseUrl !== link.url
      ) {
        conflicts.push({
          datahiveUrl: existing.crunchbaseUrl,
          name: existing.name,
          rademaUrl: link.url,
          ycId,
        })
      } else if (sourceValue && !link && !existing.sourceValueIssue) {
        existing.sourceValueIssue = sourceValue
      }
      continue
    }

    const companyName = source.company_name?.trim() || `YC company ${ycId}`
    const inferredLink = link ?? inferLinkFromCompanyName(companyName)
    const row: YcCrunchbaseAuditRow = {
      batch: source.batch?.trim() ?? '',
      crunchbaseSlug: inferredLink?.slug ?? '',
      crunchbaseUrl: inferredLink?.url ?? '',
      evidence: link
        ? sourceValue.includes('://')
          ? 'radema_cb_url'
          : 'radema_cb_slug'
        : inferredLink
          ? 'company_name_inference'
          : 'none',
      historicalOnly: true,
      linkStatus: link
        ? 'publicly_sourced'
        : inferredLink
          ? 'unverified_candidate'
          : 'no_candidate',
      name: companyName,
      rosterSource: 'radema_historical',
      sourceValueIssue: sourceValue && !link ? sourceValue : '',
      status: source.status?.trim() ?? '',
      website: source.website?.trim() ?? '',
      ycId,
      ycProfileUrl: '',
      ycSlug: '',
    }
    auditRows.push(row)
    byId.set(ycId, row)
  }
  auditRows.sort(compareAuditRows)
  return conflicts
}

function applyCommonCrawlCandidateEvidence(
  auditRows: YcCrunchbaseAuditRow[],
  sourceText: string,
) {
  const archivedUrls = new Set<string>()
  let rawNonemptyUrlLines = 0
  for (const value of sourceText.split(/\r?\n/)) {
    if (value.trim()) {
      rawNonemptyUrlLines += 1
    }
    const link = canonicalizeCrunchbaseOrganizationUrl(value)
    if (link) {
      archivedUrls.add(link.url)
    }
  }
  let matches = 0
  for (const row of auditRows) {
    if (
      row.linkStatus === 'unverified_candidate' &&
      archivedUrls.has(row.crunchbaseUrl)
    ) {
      row.linkStatus = 'archive_observed_candidate'
      row.evidence = 'commoncrawl_2019_slug_observation'
      matches += 1
    }
  }
  return { archivedUrls: archivedUrls.size, matches, rawNonemptyUrlLines }
}

async function writeOutputs(
  outputDir: string,
  sources: Awaited<ReturnType<typeof readSources>>,
  requestLog: RequestLog,
) {
  const currentCompanies = parseCurrentYcCompanies(sources.ycAll)
  const meta = sources.ycMeta as {
    last_updated?: unknown
    companies?: { all?: { count?: unknown } }
  }
  const reportedCurrentCount = meta.companies?.all?.count
  if (reportedCurrentCount !== currentCompanies.length) {
    throw new Error(
      `YC metadata reports ${String(reportedCurrentCount)} companies, but the roster has ${currentCompanies.length}`,
    )
  }

  const result = buildPublicLinkDataset(currentCompanies, sources.datahiveRows)
  const datahiveEvidence = sourceEvidence(
    sources.datahiveRows,
    {
      companyId: 'Company ID',
      companyName: 'Company Name',
      provider: 'datahive',
      url: 'CB URL',
    },
    new Set(['64']),
  )
  const rademaEvidence = sourceEvidence(sources.rademaRows, {
    companyId: 'company_id',
    companyName: 'company_name',
    provider: 'radema',
    url: 'cb_url',
  })
  const kaggleEvidence = sourceEvidence(sources.kaggleRows, {
    companyId: '',
    companyName: 'Company',
    provider: 'kaggle_startups',
    url: 'Crunchbase / Angel List Profile',
  })
  const evidence = [
    ...datahiveEvidence.evidence,
    ...rademaEvidence.evidence,
    ...kaggleEvidence.evidence,
  ].sort(
    (left, right) =>
      left.url.localeCompare(right.url) ||
      left.provider.localeCompare(right.provider) ||
      left.sourceCompanyName.localeCompare(right.sourceCompanyName),
  )
  const publiclySourcedLinks = uniqueLinks(evidence)
  verifyCanonicalLinks(publiclySourcedLinks, 'publicly sourced output')

  const sourceConflicts = enrichAuditWithRadema(result.auditRows, sources.rademaRows)
  const commonCrawl = applyCommonCrawlCandidateEvidence(
    result.auditRows,
    sources.commonCrawlUrls,
  )
  const inferredCandidates = result.auditRows.filter(
    (row) =>
      row.linkStatus === 'unverified_candidate' ||
      row.linkStatus === 'archive_observed_candidate',
  )
  const noCandidateRows = result.auditRows.filter(
    (row) => row.linkStatus === 'no_candidate',
  )
  const allCandidateLinks = uniqueLinks([
    ...evidence,
    ...result.auditRows
      .filter((row) => row.crunchbaseUrl)
      .map((row) => ({
        provider: 'datahive' as const,
        sourceCompanyId: row.ycId,
        sourceCompanyName: row.name,
        sourceValue: row.crunchbaseUrl,
        slug: row.crunchbaseSlug,
        url: row.crunchbaseUrl,
      })),
  ])
  verifyCanonicalLinks(allCandidateLinks, 'all-candidates output')

  const publiclySourcedAuditRows = result.auditRows.filter(
    (row) => row.linkStatus === 'publicly_sourced',
  )
  const auditPublicUrls = new Set(
    publiclySourcedAuditRows.map((row) => row.crunchbaseUrl),
  )
  const publicLinksWithoutRosterMapping = publiclySourcedLinks.filter(
    (link) => !auditPublicUrls.has(link.url),
  )
  const ycIdsByPublicUrl = new Map<string, Set<string>>()
  for (const row of publiclySourcedAuditRows) {
    const owners = ycIdsByPublicUrl.get(row.crunchbaseUrl) ?? new Set<string>()
    owners.add(row.ycId)
    ycIdsByPublicUrl.set(row.crunchbaseUrl, owners)
  }
  const publicUrlsMappedToMultipleYcIds = [...ycIdsByPublicUrl.values()].filter(
    (owners) => owners.size > 1,
  ).length

  const urls = publiclySourcedLinks.map((link) => link.url)
  const slugs = publiclySourcedLinks.map((link) => link.slug)
  const allCandidateUrls = allCandidateLinks.map((link) => link.url)
  const completedAt = new Date().toISOString()
  const generationName = `run-${completedAt.replace(/[:.]/g, '-')}`
  const generationDir = join(outputDir, generationName)
  const stagingDir = join(outputDir, `.staging-${generationName}-${process.pid}`)
  const auditHeaders = [
    'yc_id',
    'name',
    'yc_slug',
    'batch',
    'status',
    'website',
    'yc_profile_url',
    'roster_source',
    'historical_only',
    'link_status',
    'evidence',
    'crunchbase_slug',
    'crunchbase_url',
    'invalid_source_value',
  ]
  const toAuditCells = (row: YcCrunchbaseAuditRow) => [
    row.ycId,
    row.name,
    row.ycSlug,
    row.batch,
    row.status,
    row.website,
    row.ycProfileUrl,
    row.rosterSource,
    row.historicalOnly,
    row.linkStatus,
    row.evidence,
    row.crunchbaseSlug,
    row.crunchbaseUrl,
    row.sourceValueIssue,
  ]
  const evidenceHeaders = [
    'provider',
    'source_company_id',
    'source_company_name',
    'source_value',
    'crunchbase_slug',
    'crunchbase_url',
  ]
  const completeness = {
    allCandidateUniqueLinks: allCandidateLinks.length,
    archiveObservedCandidateCompanies: result.auditRows.filter(
      (row) => row.linkStatus === 'archive_observed_candidate',
    ).length,
    commonCrawlDictionaryUrls: commonCrawl.archivedUrls,
    commonCrawlExactSlugCandidateMatches: commonCrawl.matches,
    commonCrawlRawUrlLines: commonCrawl.rawNonemptyUrlLines,
    excludedNonPortfolioRows: result.stats.excludedNonPortfolioRows,
    historicalOnlyCompanies: result.auditRows.filter((row) => row.historicalOnly)
      .length,
    noCandidateCompanies: noCandidateRows.length,
    publicEvidenceRows: evidence.length,
    publiclySourcedCompanyRows: publiclySourcedAuditRows.length,
    publiclySourcedLinksWithoutRosterMapping:
      publicLinksWithoutRosterMapping.length,
    publiclySourcedRosterMappedUniqueLinks: auditPublicUrls.size,
    publiclySourcedUniqueLinks: publiclySourcedLinks.length,
    publicUrlsMappedToMultipleYcIds,
    rosterCompanies: result.auditRows.length,
    sourceConflicts: sourceConflicts.length,
    unverifiedCandidateCompanies: inferredCandidates.length,
  }
  const manifest = {
    schemaVersion: 2,
    completedAt,
    scope:
      'Union of the current public YC launched-company roster plus historical rows in the DataHive and Radema snapshots, excluding the Y Combinator directory self-entry.',
    publiclySourcedOutputDefinition:
      'A deduplicated union of canonical Crunchbase organization URLs explicitly present in public YC-specific datasets. It is a links inventory, not one URL per company: it retains historical/alternate links, source conflicts, and source-only rows that cannot be mapped to the union roster. No URL was opened or live-validated against Crunchbase.',
    allCandidateOutputDefinition:
      'The publicly sourced links plus syntactically safe URLs inferred from YC slugs or, for historical rows lacking a YC slug, company names. Inferred candidates may not exist or may identify another organization.',
    sources: {
      currentYcRoster: {
        provider: 'yc-oss public mirror of the YC Algolia directory index',
        url: SOURCE_FILES.ycOssAll.url,
        metadataUrl: SOURCE_FILES.ycOssMeta.url,
        snapshotUpdatedAt:
          typeof meta.last_updated === 'string' ? meta.last_updated : null,
        reportedRows: reportedCurrentCount,
        sha256: sources.hashes.ycOssAll,
        metadataSha256: sources.hashes.ycOssMeta,
      },
      datahive: {
        provider: 'DataHive via Hugging Face',
        commit: DATAHIVE_COMMIT,
        url: SOURCE_FILES.datahive.url,
        rows: sources.datahiveRows.length,
        validLinkRows: datahiveEvidence.evidence.length,
        invalidNonemptyLinkValues: datahiveEvidence.invalidNonemptyValues,
        sha256: sources.hashes.datahive,
        licenseMetadata: 'cc-by-nc-2.0',
        licenseNote:
          'The repository metadata says CC BY-NC 2.0 while its README text says CC BY-NC 4.0; resolve that discrepancy before commercial reuse.',
      },
      radema: {
        provider: 'radema/yc-scraper on GitHub',
        commit: RADEMA_COMMIT,
        url: SOURCE_FILES.radema.url,
        rows: sources.rademaRows.length,
        validLinkRows: rademaEvidence.evidence.length,
        invalidNonemptyLinkValues: rademaEvidence.invalidNonemptyValues,
        sha256: sources.hashes.radema,
        license: 'MIT',
      },
      kaggleHistorical: {
        provider: 'joebeachcapital/startups on Kaggle',
        datasetVersion: 1,
        createdAt: '2023-08-15T01:33:39.220Z',
        url: 'https://www.kaggle.com/datasets/joebeachcapital/startups',
        rows: sources.kaggleRows.length,
        validLinkRows: kaggleEvidence.evidence.length,
        invalidNonemptyLinkValues: kaggleEvidence.invalidNonemptyValues,
        sha256: sources.hashes.kaggle,
        license: 'CC-BY-SA-4.0',
      },
      commonCrawlCandidateIndex: {
        provider: 'Common Crawl ZipNum index',
        crawl: 'CC-MAIN-2019-51',
        clusterIndex: {
          url: 'https://data.commoncrawl.org/cc-index/collections/CC-MAIN-2019-51/indexes/cluster.idx',
          bytes: 126789416,
          sha256:
            '0ac6820945683d44eff2fa28f292c3c5de8bf0eb7dcf2c557e65a5f0762f3e5f',
        },
        derivedUrlDictionary: {
          filename: STATIC_SOURCE_FILES.commonCrawl,
          rawUrlLines: commonCrawl.rawNonemptyUrlLines,
          canonicalUniqueUrls: commonCrawl.archivedUrls,
          sha256: sources.hashes.commonCrawl,
        },
        note:
          'The local URL dictionary was derived from the organization-prefix blocks selected from cluster.idx. It is used only to label exact YC-slug candidates as historically observed. A crawl attempt does not prove company identity or current URL validity.',
      },
    },
    completeness,
    networkSafety: {
      crunchbaseRequests: 0,
      browserOpened: false,
      browserProfileRead: false,
      crunchbaseApiKeyRead: false,
      cookiesRead: false,
      refreshRequested: Object.values(requestLog.countByHostname).some(
        (count) => count > 0,
      ),
      allowedSourceHosts: [...ALLOWED_SOURCE_HOSTS].sort(),
      requestsByHostname: requestLog.countByHostname,
      redirectsFollowedAfterAllowlistValidation: requestLog.redirectCount,
    },
    outputs: {
      publiclySourcedLinksText: 'yc-crunchbase-links.txt',
      publiclySourcedLinksJson: 'yc-crunchbase-links.json',
      publiclySourcedSlugsJson: 'yc-crunchbase-slugs.json',
      allCandidatesText: 'yc-crunchbase-all-candidates.txt',
      allCandidatesJson: 'yc-crunchbase-all-candidates.json',
      auditCsv: 'yc-crunchbase-audit.csv',
      inferredCandidatesCsv: 'yc-crunchbase-candidates.csv',
      noCandidateCsv: 'yc-companies-without-candidate.csv',
      publicEvidenceCsv: 'yc-crunchbase-public-evidence.csv',
      sourceConflictsCsv: 'yc-crunchbase-source-conflicts.csv',
    },
  }

  await mkdir(stagingDir)
  try {
    await Promise.all([
      writeFile(join(stagingDir, 'yc-crunchbase-links.txt'), `${urls.join('\n')}\n`),
      writeFile(
        join(stagingDir, 'yc-crunchbase-links.json'),
        `${JSON.stringify(urls, null, 2)}\n`,
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-slugs.json'),
        `${JSON.stringify(slugs, null, 2)}\n`,
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-all-candidates.txt'),
        `${allCandidateUrls.join('\n')}\n`,
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-all-candidates.json'),
        `${JSON.stringify(allCandidateUrls, null, 2)}\n`,
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-audit.csv'),
        rowsToCsv(auditHeaders, result.auditRows.map(toAuditCells)),
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-candidates.csv'),
        rowsToCsv(auditHeaders, inferredCandidates.map(toAuditCells)),
      ),
      writeFile(
        join(stagingDir, 'yc-companies-without-candidate.csv'),
        rowsToCsv(auditHeaders, noCandidateRows.map(toAuditCells)),
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-public-evidence.csv'),
        rowsToCsv(
          evidenceHeaders,
          evidence.map((row) => [
            row.provider,
            row.sourceCompanyId,
            row.sourceCompanyName,
            row.sourceValue,
            row.slug,
            row.url,
          ]),
        ),
      ),
      writeFile(
        join(stagingDir, 'yc-crunchbase-source-conflicts.csv'),
        rowsToCsv(
          ['yc_id', 'name', 'datahive_url', 'radema_url'],
          sourceConflicts.map((row) => [
            row.ycId,
            row.name,
            row.datahiveUrl,
            row.rademaUrl,
          ]),
        ),
      ),
      writeFile(
        join(stagingDir, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      ),
    ])
    await rename(stagingDir, generationDir)
  } catch (error) {
    await rm(stagingDir, { force: true, recursive: true })
    throw error
  }
  return { completeness, generationDir }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const sourceDir = join(options.outputDir, 'source')
  const requestLog: RequestLog = { countByHostname: {}, redirectCount: 0 }
  if (options.refreshSources) {
    await refreshSources(sourceDir, requestLog)
  }

  let sources: Awaited<ReturnType<typeof readSources>>
  try {
    sources = await readSources(sourceDir)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new Error(
        'A public source snapshot is missing. Restore the source directory or run --refresh-sources for the allowlisted refreshable files. No Crunchbase request is ever made.',
      )
    }
    throw error
  }

  const { completeness, generationDir } = await writeOutputs(
    options.outputDir,
    sources,
    requestLog,
  )
  console.log('Crunchbase requests: 0')
  console.log(`YC companies in union roster: ${completeness.rosterCompanies}`)
  console.log(
    `Publicly sourced unique Crunchbase links: ${completeness.publiclySourcedUniqueLinks}`,
  )
  console.log(`All unique links/candidates: ${completeness.allCandidateUniqueLinks}`)
  console.log(
    `Companies without any candidate: ${completeness.noCandidateCompanies}`,
  )
  console.log(`Output: ${generationDir}`)
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
