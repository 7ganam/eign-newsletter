import { createHash } from 'node:crypto'

type UnknownRecord = Record<string, unknown>

export type CsvRecord = Record<string, string>

export type CurrentYcCompany = {
  batch: string
  id: string
  name: string
  slug: string
  status: string
  url: string
  website: string
}

export type PublicCrunchbaseLink = {
  slug: string
  url: string
}

export type YcCrunchbaseAuditRow = {
  batch: string
  crunchbaseSlug: string
  crunchbaseUrl: string
  evidence:
    | 'commoncrawl_2019_slug_observation'
    | 'company_name_inference'
    | 'datahive_cb_slug'
    | 'datahive_cb_url'
    | 'none'
    | 'radema_cb_slug'
    | 'radema_cb_url'
    | 'yc_slug_inference'
  historicalOnly: boolean
  linkStatus:
    | 'archive_observed_candidate'
    | 'no_candidate'
    | 'publicly_sourced'
    | 'unverified_candidate'
  name: string
  rosterSource:
    | 'datahive_historical'
    | 'radema_historical'
    | 'yc_oss_current'
  sourceValueIssue: string
  status: string
  website: string
  ycId: string
  ycProfileUrl: string
  ycSlug: string
}

export type PublicLinkDataset = {
  auditRows: YcCrunchbaseAuditRow[]
  publiclySourcedLinks: PublicCrunchbaseLink[]
  stats: {
    excludedNonPortfolioRows: number
    historicalOnlyCompanies: number
    invalidNonemptySourceValues: number
    publiclySourcedCompanyRows: number
    publiclySourcedUniqueLinks: number
    rosterCompanies: number
    unverifiedCandidateCompanies: number
    uniqueLinkCollisions: number
  }
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as UnknownRecord
}

function requiredText(value: unknown, field: string) {
  const result = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  if (!result) {
    throw new Error(`Missing ${field}`)
  }
  return result
}

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseCsv(input: string): CsvRecord[] {
  const text = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  const finishField = () => {
    row.push(field)
    field = ''
  }

  const finishRow = () => {
    finishField()
    rows.push(row)
    row = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      if (field) {
        throw new Error('Malformed CSV: quote starts inside an unquoted field')
      }
      quoted = true
      continue
    }

    if (character === ',') {
      finishField()
      continue
    }

    if (character === '\n') {
      finishRow()
      continue
    }

    if (character === '\r') {
      if (text[index + 1] === '\n') {
        index += 1
      }
      finishRow()
      continue
    }

    field += character
  }

  if (quoted) {
    throw new Error('Malformed CSV: unterminated quoted field')
  }
  if (field || row.length > 0) {
    finishRow()
  }
  while (rows.length && rows.at(-1)?.every((value) => value === '')) {
    rows.pop()
  }
  if (rows.length === 0) {
    throw new Error('CSV contains no header row')
  }

  const headers = rows[0]
  if (headers.some((header) => !header)) {
    throw new Error('CSV contains an empty header')
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV contains duplicate headers')
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}`,
      )
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]))
  })
}

export function canonicalizeCrunchbaseOrganizationUrl(
  value: string,
): PublicCrunchbaseLink | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (/^[\p{L}\p{N}][\p{L}\p{N}._'()-]{0,199}$/u.test(trimmed)) {
    const slug = trimmed.toLocaleLowerCase('en-US')
    return {
      slug,
      url: `https://www.crunchbase.com/organization/${encodeURIComponent(slug)}`,
    }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return undefined
  }

  const hostname = parsed.hostname.toLowerCase()
  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    (hostname !== 'www.crunchbase.com' && hostname !== 'crunchbase.com')
  ) {
    return undefined
  }

  const match = parsed.pathname.match(/^\/organization\/([^/]+)(?:\/.*)?$/)
  if (!match) {
    return undefined
  }

  let slug: string
  try {
    slug = decodeURIComponent(match[1])
  } catch {
    return undefined
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._'()-]{0,199}$/u.test(slug)) {
    return undefined
  }

  const normalizedSlug = slug.toLocaleLowerCase('en-US')
  return {
    slug: normalizedSlug,
    url: `https://www.crunchbase.com/organization/${encodeURIComponent(normalizedSlug)}`,
  }
}

export function inferCrunchbaseOrganizationUrl(
  ycSlug: string,
): PublicCrunchbaseLink | undefined {
  const slug = ycSlug.trim().toLowerCase()
  if (
    slug === '.' ||
    slug === '..' ||
    !/^[a-z0-9][a-z0-9._-]{0,199}$/.test(slug)
  ) {
    return undefined
  }
  return {
    slug,
    url: `https://www.crunchbase.com/organization/${slug}`,
  }
}

export function parseCurrentYcCompanies(value: unknown): CurrentYcCompany[] {
  if (!Array.isArray(value)) {
    throw new Error('Current YC roster must be a JSON array')
  }

  const ids = new Set<string>()
  return value.map((entry, index) => {
    const record = asRecord(entry)
    if (!record) {
      throw new Error(`Current YC roster row ${index + 1} is not an object`)
    }
    const id = requiredText(record.id, `YC id at row ${index + 1}`)
    if (ids.has(id)) {
      throw new Error(`Duplicate YC id in current roster: ${id}`)
    }
    ids.add(id)

    const slug = requiredText(record.slug, `YC slug for ${id}`)
    const url = optionalText(record.url)
    const expectedUrl = `https://www.ycombinator.com/companies/${slug}`
    if (url && url !== expectedUrl) {
      throw new Error(`Unexpected YC profile URL for ${id}: ${url}`)
    }

    return {
      batch: optionalText(record.batch),
      id,
      name: requiredText(record.name, `YC name for ${id}`),
      slug,
      status: optionalText(record.status),
      url: url || expectedUrl,
      website: optionalText(record.website),
    }
  })
}

function compareRosterRows(left: YcCrunchbaseAuditRow, right: YcCrunchbaseAuditRow) {
  return (
    left.name.localeCompare(right.name) ||
    left.ycId.localeCompare(right.ycId, undefined, { numeric: true })
  )
}

export function buildPublicLinkDataset(
  currentCompanies: CurrentYcCompany[],
  datahiveRows: CsvRecord[],
): PublicLinkDataset {
  const datahiveById = new Map<string, CsvRecord>()
  for (const [index, row] of datahiveRows.entries()) {
    const id = requiredText(row['Company ID'], `DataHive Company ID at row ${index + 2}`)
    if (datahiveById.has(id)) {
      throw new Error(`Duplicate DataHive Company ID: ${id}`)
    }
    datahiveById.set(id, row)
  }

  const currentById = new Map(currentCompanies.map((company) => [company.id, company]))
  const allIds = new Set([...currentById.keys(), ...datahiveById.keys()])
  const excludedIds = new Set(
    currentCompanies
      .filter(
        (company) =>
          company.id === '64' &&
          company.name === 'Y Combinator' &&
          company.batch === 'Unspecified',
      )
      .map((company) => company.id),
  )

  const auditRows: YcCrunchbaseAuditRow[] = []
  let invalidNonemptySourceValues = 0

  for (const id of allIds) {
    if (excludedIds.has(id)) {
      continue
    }
    const current = currentById.get(id)
    const historical = datahiveById.get(id)
    const ycSlug = current?.slug || requiredText(historical?.Slug, `historical YC slug for ${id}`)
    const profilePath = optionalText(historical?.['YC DC Company URL'])
    const ycProfileUrl =
      current?.url ||
      (profilePath.startsWith('/')
        ? `https://www.ycombinator.com${profilePath}`
        : `https://www.ycombinator.com/companies/${ycSlug}`)
    const sourceValue = optionalText(historical?.['CB URL'])
    const sourcedLink = canonicalizeCrunchbaseOrganizationUrl(sourceValue)
    const inferredLink = inferCrunchbaseOrganizationUrl(ycSlug)
    if (!sourcedLink && !inferredLink) {
      throw new Error(`Cannot construct a safe Crunchbase candidate for YC company ${id}`)
    }
    if (sourceValue && !sourcedLink) {
      invalidNonemptySourceValues += 1
    }

    const selectedLink = sourcedLink ?? inferredLink!
    auditRows.push({
      batch: current?.batch || optionalText(historical?.Batch),
      crunchbaseSlug: selectedLink.slug,
      crunchbaseUrl: selectedLink.url,
      evidence: sourcedLink
        ? sourceValue.includes('://')
          ? 'datahive_cb_url'
          : 'datahive_cb_slug'
        : 'yc_slug_inference',
      historicalOnly: !current,
      linkStatus: sourcedLink ? 'publicly_sourced' : 'unverified_candidate',
      name: current?.name || requiredText(historical?.['Company Name'], `historical name for ${id}`),
      rosterSource: current ? 'yc_oss_current' : 'datahive_historical',
      sourceValueIssue: sourceValue && !sourcedLink ? sourceValue : '',
      status: current?.status || optionalText(historical?.Status),
      website: current?.website || optionalText(historical?.Website),
      ycId: id,
      ycProfileUrl,
      ycSlug,
    })
  }

  auditRows.sort(compareRosterRows)
  const sourcedRows = auditRows.filter((row) => row.linkStatus === 'publicly_sourced')
  const linksByUrl = new Map<string, PublicCrunchbaseLink>()
  for (const row of sourcedRows) {
    linksByUrl.set(row.crunchbaseUrl, {
      slug: row.crunchbaseSlug,
      url: row.crunchbaseUrl,
    })
  }
  const publiclySourcedLinks = [...linksByUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url),
  )

  return {
    auditRows,
    publiclySourcedLinks,
    stats: {
      excludedNonPortfolioRows: excludedIds.size,
      historicalOnlyCompanies: auditRows.filter((row) => row.historicalOnly).length,
      invalidNonemptySourceValues,
      publiclySourcedCompanyRows: sourcedRows.length,
      publiclySourcedUniqueLinks: publiclySourcedLinks.length,
      rosterCompanies: auditRows.length,
      unverifiedCandidateCompanies: auditRows.length - sourcedRows.length,
      uniqueLinkCollisions: sourcedRows.length - publiclySourcedLinks.length,
    },
  }
}

export function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

export function csvCell(value: string | number | boolean) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
