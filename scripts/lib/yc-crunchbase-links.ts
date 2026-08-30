type UnknownRecord = Record<string, unknown>

export type CrunchbasePortfolioLink = {
  name: string
  slug: string
  url: string
}

export type FundingRoundPage = {
  cursor: string | undefined
  entityCount: number
  fundingRoundKeys: string[]
  links: Array<CrunchbasePortfolioLink & { organizationKey: string }>
  missingOrganizationCount: number
  totalCount: number
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as UnknownRecord
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function finiteNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined
}

function canonicalOrganizationUrl(slug: string) {
  if (
    slug === '.' ||
    slug === '..' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(slug)
  ) {
    throw new Error(`Invalid Crunchbase organization permalink: ${slug}`)
  }
  const url = new URL(
    `/organization/${encodeURIComponent(slug)}`,
    'https://www.crunchbase.com',
  )
  if (url.origin !== 'https://www.crunchbase.com') {
    throw new Error(`Invalid Crunchbase organization permalink: ${slug}`)
  }
  return url.toString()
}

export function parseFundingRoundPage(value: unknown): FundingRoundPage {
  const root = asRecord(value)
  if (!root) {
    throw new Error('Crunchbase response is not a JSON object')
  }

  if (!Array.isArray(root.entities)) {
    throw new Error('Crunchbase response is missing the funding-round entities array')
  }
  const entities = root.entities
  const totalCount = finiteNonNegativeInteger(root.count)
  if (totalCount === undefined) {
    throw new Error('Crunchbase response is missing a valid total count')
  }
  const links: FundingRoundPage['links'] = []
  const fundingRoundKeys: string[] = []
  let missingOrganizationCount = 0

  for (const entityValue of entities) {
    const entity = asRecord(entityValue)
    const fundingRoundKey = text(entity?.uuid)
    if (!fundingRoundKey) {
      throw new Error('Crunchbase page contains a funding round without an identity')
    }
    fundingRoundKeys.push(fundingRoundKey)

    const properties = asRecord(entity?.properties)
    const organization = asRecord(properties?.funded_organization_identifier)
    const organizationKey = text(organization?.uuid)
    const slug = text(organization?.permalink)

    if (!organizationKey || !slug) {
      missingOrganizationCount += 1
      continue
    }

    links.push({
      name: text(organization?.value) ?? slug,
      organizationKey,
      slug,
      url: canonicalOrganizationUrl(slug),
    })
  }

  const lastEntity = asRecord(entities.at(-1))
  const cursor = text(lastEntity?.uuid)
  if (entities.length > 0 && !cursor) {
    throw new Error('Crunchbase page is missing the final funding-round cursor')
  }

  return {
    cursor,
    entityCount: entities.length,
    fundingRoundKeys,
    links,
    missingOrganizationCount,
    totalCount,
  }
}

export class PortfolioLinkCollector {
  private readonly byOrganization = new Map<
    string,
    CrunchbasePortfolioLink
  >()

  private membershipRows = 0
  private missingOrganizationRows = 0
  private permalinkChanges = 0
  private readonly seenFundingRounds = new Set<string>()

  add(page: FundingRoundPage) {
    for (const fundingRoundKey of page.fundingRoundKeys) {
      if (this.seenFundingRounds.has(fundingRoundKey)) {
        throw new Error('Crunchbase pagination returned a duplicate funding round')
      }
      this.seenFundingRounds.add(fundingRoundKey)
    }

    this.membershipRows += page.entityCount
    this.missingOrganizationRows += page.missingOrganizationCount

    for (const { organizationKey, ...link } of page.links) {
      const previous = this.byOrganization.get(organizationKey)
      if (previous && previous.slug !== link.slug) {
        this.permalinkChanges += 1
      }
      this.byOrganization.set(organizationKey, link)
    }
  }

  finish() {
    const links = [...this.byOrganization.values()].sort((left, right) =>
      left.url.localeCompare(right.url),
    )
    const slugOwners = new Map<string, string>()

    for (const link of links) {
      const normalizedSlug = link.slug.toLowerCase()
      const previousUrl = slugOwners.get(normalizedSlug)
      if (previousUrl && previousUrl !== link.url) {
        throw new Error(`Conflicting Crunchbase URLs for slug ${link.slug}`)
      }
      slugOwners.set(normalizedSlug, link.url)
    }

    if (new Set(links.map((link) => link.url)).size !== links.length) {
      throw new Error('Duplicate Crunchbase organization URLs remain after deduplication')
    }

    return {
      links,
      stats: {
        additionalFundingRoundRowsForExistingOrganizations:
          this.membershipRows - this.missingOrganizationRows - links.length,
        membershipRows: this.membershipRows,
        missingOrganizationRows: this.missingOrganizationRows,
        permalinkChanges: this.permalinkChanges,
        uniqueFundingRounds: this.seenFundingRounds.size,
        uniqueOrganizations: links.length,
      },
    }
  }
}
