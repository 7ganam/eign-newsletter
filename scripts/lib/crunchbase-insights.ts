type UnknownRecord = Record<string, unknown>

const uuidPattern =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

type MoneyFact = {
  amount: number
  currency: string
}

type FundingRoundFact = {
  announcedDate?: string
  amount?: MoneyFact
  investorCount?: number
  leadInvestors?: string[]
  postMoneyValuation?: MoneyFact
  type?: string
}

type Insight = {
  caveats?: string[]
  confidence: 'high' | 'medium' | 'low'
  evidence: string[]
  implication: string
  statement: string
  title: string
}

const revenueRanges: Record<string, string> = {
  r_00000000: 'Less than $1M',
  r_00001000: '$1M-$10M',
  r_00010000: '$10M-$50M',
  r_00050000: '$50M-$100M',
  r_00100000: '$100M-$500M',
  r_00500000: '$500M-$1B',
  r_01000000: '$1B-$10B',
  r_10000000: '$10B+',
}

const forbiddenOutputKeys = new Set([
  'accessToken',
  'account',
  'authenticated',
  'authentication',
  'auth',
  'cards',
  'cookie',
  'control_tags',
  'email',
  'entity_def_id',
  'extraction',
  'facet_ids',
  'id',
  'ids',
  'identifier',
  'image_id',
  'internalId',
  'layout_id',
  'method',
  'pageTitle',
  'permalink',
  'phone',
  'preview_properties',
  'queries',
  'sessionId',
  'token',
  'uuid',
])

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as UnknownRecord
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function read(value: unknown, ...path: string[]): unknown {
  let current = value

  for (const key of path) {
    const record = asRecord(current)
    if (!record) {
      return undefined
    }
    current = record[key]
  }

  return current
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function nameOf(value: unknown) {
  return text(read(value, 'value'))
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function namesOf(value: unknown) {
  return uniqueStrings(asArray(value).map(nameOf))
}

function roundTo(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function percentage(value: number | undefined) {
  return value === undefined ? undefined : roundTo(value * 100)
}

function humanizeEnum(value: unknown) {
  const raw = text(value)
  if (!raw) {
    return undefined
  }

  const specialValues: Record<string, string> = {
    convertible_note: 'Convertible note',
    for_profit: 'For profit',
    non_profit: 'Nonprofit',
    series_unknown: 'Venture round',
  }

  if (specialValues[raw]) {
    return specialValues[raw]
  }

  return raw
    .split('_')
    .map((part) => {
      if (/^[a-z]$/i.test(part)) {
        return part.toUpperCase()
      }
      if (part.toLowerCase() === 'ipo') {
        return 'IPO'
      }
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function employeeRange(value: unknown) {
  const raw = text(value)
  const match = raw?.match(/^c_(\d{5})_(\d{5}|max)$/)
  if (!match) {
    return undefined
  }

  const minimum = Number(match[1])
  if (match[2] === 'max') {
    return `${minimum.toLocaleString('en-US')}+`
  }

  return `${minimum.toLocaleString('en-US')}-${Number(match[2]).toLocaleString('en-US')}`
}

function money(value: unknown): MoneyFact | undefined {
  const amountUsd = finiteNumber(read(value, 'value_usd'))
  if (amountUsd !== undefined && amountUsd >= 0) {
    return {
      amount: amountUsd,
      currency: 'USD',
    }
  }

  const nativeAmount = finiteNumber(read(value, 'value'))
  if (nativeAmount === undefined || nativeAmount < 0) {
    return undefined
  }

  return {
    amount: nativeAmount,
    currency: text(read(value, 'currency')) ?? 'USD',
  }
}

function cleanUrl(value: unknown) {
  const raw = text(value)
  if (!raw) {
    return undefined
  }

  try {
    const url = new URL(raw)
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith('utm_') ||
        ['fbclid', 'gclid', 'module'].includes(key.toLowerCase())
      ) {
        url.searchParams.delete(key)
      }
    }
    url.hash = ''
    const cleaned = url.toString()
    return uuidPattern.test(cleaned) ? undefined : cleaned
  } catch {
    return uuidPattern.test(raw) ? undefined : raw
  }
}

function formatMoney(value: MoneyFact | undefined) {
  if (!value) {
    return undefined
  }

  return new Intl.NumberFormat('en-US', {
    currency: value.currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value.amount)
}

function compact(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (Array.isArray(value)) {
    const items = value
      .map(compact)
      .filter((item) => item !== undefined)
    return items.length ? items : undefined
  }

  const record = asRecord(value)
  if (record) {
    const entries = Object.entries(record)
      .map(([key, nestedValue]) => [key, compact(nestedValue)] as const)
      .filter(([, nestedValue]) => nestedValue !== undefined)
    return entries.length ? Object.fromEntries(entries) : undefined
  }

  return value
}

function redactEmailAddresses(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(
      new RegExp(emailPattern.source, 'gi'),
      '[email omitted]',
    )
  }

  if (Array.isArray(value)) {
    return value.map(redactEmailAddresses)
  }

  const record = asRecord(value)
  if (!record) {
    return value
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, nestedValue]) => [
      key,
      redactEmailAddresses(nestedValue),
    ]),
  )
}

function dedupeBy<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFor(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function cleanRoundName(value: string | undefined, companyName: string) {
  if (!value) {
    return undefined
  }

  const suffix = ` - ${companyName}`
  const cleaned = value.endsWith(suffix)
    ? value.slice(0, -suffix.length)
    : value
  return cleaned.toLowerCase() === 'venture round' ? 'Venture round' : cleaned
}

function prediction(value: unknown) {
  const item = asRecord(asArray(value)[0])
  if (!item) {
    return undefined
  }

  return compact({
    generatedDate: text(item.generated_on),
    probabilityPercent: percentage(finiteNumber(item.probability_score)),
  })
}

function fundingPrediction(value: unknown) {
  const item = asRecord(asArray(value)[0])
  if (!item) {
    return undefined
  }

  const timeSeries = asRecord(item.probability_score_timeseries)
  return compact({
    generatedDate: text(item.generated_on),
    probabilityPercent: percentage(finiteNumber(item.probability_score)),
    timingEstimatePercent: timeSeries
      ? {
          within6Months: percentage(
            finiteNumber(timeSeries.months_00_to_05),
          ),
          months6To11: percentage(
            finiteNumber(timeSeries.months_06_to_11),
          ),
          months12To24: percentage(
            finiteNumber(timeSeries.months_12_to_24),
          ),
          beyond24Months: percentage(
            finiteNumber(timeSeries.months_24_plus),
          ),
        }
      : undefined,
  })
}

function insight(
  title: string,
  statement: string,
  implication: string,
  confidence: Insight['confidence'],
  evidence: string[],
  caveats?: string[],
): Insight {
  return {
    title,
    statement,
    implication,
    confidence,
    evidence,
    ...(caveats?.length ? { caveats } : {}),
  }
}

export function assertInsightsAreClean(value: unknown) {
  const forbiddenKeyPartPattern =
    /(^|_)(id|ids|uuid|identifier|permalink|session|auth|authentication|authenticated|token|cookie|account|email|phone)(_|$)/i

  function visit(current: unknown, path: string[]) {
    if (typeof current === 'string' && uuidPattern.test(current)) {
      throw new Error(`Insights contain a UUID-shaped value at ${path.join('.')}`)
    }
    if (typeof current === 'string' && emailPattern.test(current)) {
      throw new Error(`Insights contain an email-shaped value at ${path.join('.')}`)
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        throw new Error(`Insights contain an empty array at ${path.join('.')}`)
      }
      current.forEach((item, index) => visit(item, [...path, String(index)]))
      return
    }

    const record = asRecord(current)
    if (!record) {
      return
    }

    const keys = Object.keys(record)
    if (keys.length === 0) {
      throw new Error(`Insights contain an empty object at ${path.join('.')}`)
    }

    for (const [key, nestedValue] of Object.entries(record)) {
      const normalizedKey = key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
      if (
        forbiddenOutputKeys.has(key) ||
        forbiddenKeyPartPattern.test(normalizedKey) ||
        /(^|_)(image_id|entity_def_id)(_|$)/i.test(normalizedKey)
      ) {
        throw new Error(
          `Insights contain forbidden internal field ${[...path, key].join('.')}`,
        )
      }
      visit(nestedValue, [...path, key])
    }
  }

  visit(value, [])
}

export function buildCrunchbaseInsights(rawValue: unknown) {
  const root = asRecord(rawValue)
  const organization = asRecord(root?.organization)
  const properties = asRecord(organization?.properties)
  const cards = asRecord(organization?.cards)

  if (!root || !properties || !cards) {
    throw new Error('Input is not a supported Crunchbase organization scrape')
  }

  const companyName =
    text(properties.title) ?? nameOf(properties.identifier)
  if (!companyName) {
    throw new Error('Crunchbase organization name is missing')
  }

  const overview = asRecord(cards.overview_fields_extended) ?? {}
  const companyAbout = asRecord(cards.company_about_fields2) ?? {}
  const companyFields = asRecord(cards.overview_company_fields) ?? {}
  const locationRecords = asArray(companyAbout.location_identifiers)
    .map(asRecord)
    .filter((item): item is UnknownRecord => Boolean(item))
  const locationByType = new Map(
    locationRecords.map((item) => [text(item.location_type), text(item.value)]),
  )
  const headquarters = uniqueStrings([
    locationByType.get('city'),
    locationByType.get('region'),
    locationByType.get('country'),
  ]).join(', ')

  const timeline = asRecord(cards.overview_timeline) ?? {}
  const newsItems = dedupeBy(
    asArray(timeline.entities)
      .map((entity) => {
        const itemProperties = asRecord(read(entity, 'properties')) ?? {}
        const activity = asRecord(itemProperties.activity_properties) ?? {}
        return compact({
          date: text(itemProperties.activity_date),
          publisher: text(activity.publisher),
          title:
            text(activity.title) ?? nameOf(itemProperties.identifier),
          url: cleanUrl(read(activity.url, 'value')),
        }) as UnknownRecord | undefined
      })
      .filter((item): item is UnknownRecord => Boolean(item))
      .sort((left, right) =>
        (text(right.date) ?? '').localeCompare(text(left.date) ?? ''),
      ),
    (item) =>
      text(item.url) ?? `${text(item.date) ?? ''}|${text(item.title) ?? ''}`,
  )

  const rebrandNews = newsItems.find((item) =>
    (text(item.title) ?? '').toLowerCase().includes(
      ` becomes ${companyName}`.toLowerCase(),
    ),
  )
  const rebrandTitle = text(rebrandNews?.title)
  const rebrandMarker = ` Becomes ${companyName}`
  const rebrandIndex = rebrandTitle
    ?.toLowerCase()
    .indexOf(rebrandMarker.toLowerCase())
  const formerName =
    rebrandTitle && rebrandIndex !== undefined && rebrandIndex > 0
      ? rebrandTitle.slice(0, rebrandIndex).trim()
      : undefined

  const productFacts = asArray(cards.product)
    .map((item) =>
      compact({
        description: text(read(item, 'description')),
        name: text(read(item, 'name')) ?? nameOf(read(item, 'identifier')),
      }),
    )
    .filter((item): item is UnknownRecord => Boolean(item))

  const rawRounds = asArray(cards.funding_rounds_list)
  const roundFacts: FundingRoundFact[] = rawRounds
    .map((item) => {
      const record = asRecord(item) ?? {}
      const round: FundingRoundFact = {
        announcedDate: text(record.announced_on),
        amount: money(record.money_raised),
        investorCount: finiteNumber(record.num_investors),
        leadInvestors: namesOf(record.lead_investor_identifiers),
        postMoneyValuation: money(record.post_money_valuation),
        type: humanizeEnum(record.investment_type),
      }
      return compact(round) as FundingRoundFact | undefined
    })
    .filter((item): item is FundingRoundFact => Boolean(item))
    .sort((left, right) =>
      (right.announcedDate ?? '').localeCompare(left.announcedDate ?? ''),
    )

  const fundingSummary = asRecord(cards.funding_rounds_summary) ?? {}
  const financialHighlights =
    asRecord(cards.company_financials_highlights) ?? {}
  const totalFunding =
    money(fundingSummary.funding_total) ??
    money(financialHighlights.funding_total)
  const reportedRoundCount =
    finiteNumber(fundingSummary.num_funding_rounds) ??
    finiteNumber(financialHighlights.num_funding_rounds)
  const reportedInvestorCount =
    finiteNumber(read(cards.investors_summary, 'num_investors')) ??
    finiteNumber(financialHighlights.num_investors)

  const investorMap = new Map<
    string,
    { isLead: boolean; name: string; rounds: Set<string> }
  >()
  const addInvestor = (
    name: string | undefined,
    round: string | undefined,
    isLead: boolean,
  ) => {
    if (!name) {
      return
    }
    const existing = investorMap.get(name) ?? {
      isLead: false,
      name,
      rounds: new Set<string>(),
    }
    if (round) {
      existing.rounds.add(round)
    }
    existing.isLead ||= isLead
    investorMap.set(name, existing)
  }

  namesOf(properties.investor_identifiers).forEach((name) =>
    addInvestor(name, undefined, false),
  )
  asArray(cards.investors_list).forEach((item) => {
    addInvestor(
      nameOf(read(item, 'investor_identifier')),
      cleanRoundName(
        nameOf(read(item, 'funding_round_identifier')),
        companyName,
      ),
      read(item, 'is_lead_investor') === true,
    )
  })
  const investors = [...investorMap.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) =>
      compact({
        isLead: item.isLead || undefined,
        name: item.name,
        rounds: [...item.rounds],
      }),
    )

  const partnershipFacts = asArray(cards.partnership_announcements)
    .map((item) =>
      compact({
        date: text(read(item, 'key_event_date')),
        description: text(read(item, 'description')),
        sources: dedupeBy(
          asArray(read(item, 'press_references'))
            .map((source) =>
              compact({
                date: text(read(source, 'posted_on')),
                publisher: text(read(source, 'publisher')),
                title: text(read(source, 'value')),
                url: cleanUrl(read(source, 'source_url')),
              }),
            )
            .filter((source): source is UnknownRecord => Boolean(source)),
          (source) =>
            text(source.url) ??
            `${text(source.date) ?? ''}|${text(source.title) ?? ''}`,
        ),
      }),
    )
    .filter((item): item is UnknownRecord => Boolean(item))

  const similarCompanies = asArray(cards.competitors_list)
    .slice(0, 5)
    .map((item) =>
      compact({
        description: text(read(item, 'target_short_description')),
        employeeRange: employeeRange(read(item, 'target_num_employees_enum')),
        name: nameOf(read(item, 'target')),
        sharedCategories: namesOf(read(item, 'category_overlap')),
        sharedSpecialties: namesOf(read(item, 'micro_category_overlap')),
        similarityScore: finiteNumber(read(item, 'score')),
      }),
    )
    .filter((item): item is UnknownRecord => Boolean(item))

  const growthAndHeat = asRecord(cards.growth_and_heat) ?? {}
  const growthKnowledge = asRecord(cards.growth_knowledge) ?? {}
  const growthKnowledgeItem = asRecord(asArray(growthKnowledge.data)[0])
  const momentum = compact({
    growthInsightGeneratedDate: text(growthKnowledgeItem?.generated_on),
    growthChange90Days: finiteNumber(growthAndHeat.growth_score_delta_d90),
    growthScore: finiteNumber(growthAndHeat.growth_score),
    heatChange90Days: finiteNumber(growthAndHeat.heat_score_delta_d90),
    heatScore: finiteNumber(growthAndHeat.heat_score),
    status: humanizeEnum(read(growthKnowledge, 'properties', 'growth_insight_indicator')),
  })

  const modelPredictions = compact({
    acquisition: prediction(cards.acquisition_prediction),
    funding: fundingPrediction(cards.funding_prediction),
    growth: prediction(cards.growth_prediction),
    ipo: prediction(cards.ipo_prediction),
  })

  const knownDetailedFundingAmount = roundFacts.reduce(
    (sum, round) => sum + (round.amount?.amount ?? 0),
    0,
  )
  const disclosedAmountRoundCount = roundFacts.filter(
    (round) => round.amount,
  ).length
  const grantRounds = roundFacts.filter(
    (round) => round.type?.toLowerCase() === 'grant',
  )
  const grantFundingAmount = grantRounds.reduce(
    (sum, round) => sum + (round.amount?.amount ?? 0),
    0,
  )
  const latestRound = roundFacts[0]
  const valuations = roundFacts
    .filter((round) => round.postMoneyValuation && round.announcedDate)
    .sort((left, right) =>
      (left.announcedDate ?? '').localeCompare(right.announcedDate ?? ''),
    )
  const earliestValuation = valuations[0]?.postMoneyValuation
  const latestValuation = valuations.at(-1)?.postMoneyValuation
  const fundingCoveragePercent =
    totalFunding?.amount && knownDetailedFundingAmount
      ? roundTo((knownDetailedFundingAmount / totalFunding.amount) * 100)
      : undefined
  const unattributedFundingAmount =
    totalFunding?.amount !== undefined
      ? Math.max(0, totalFunding.amount - knownDetailedFundingAmount)
      : undefined
  const latestRoundSharePercent =
    totalFunding?.amount && latestRound?.amount
      ? roundTo((latestRound.amount.amount / totalFunding.amount) * 100)
      : undefined
  const grantSharePercent =
    totalFunding?.amount && grantFundingAmount
      ? roundTo((grantFundingAmount / totalFunding.amount) * 100)
      : undefined
  const valuationMultiple =
    earliestValuation?.amount && latestValuation?.amount
      ? roundTo(latestValuation.amount / earliestValuation.amount)
      : undefined

  const ipoNews = newsItems.filter((item) =>
    /\bipo\b|\blisting\b/i.test(text(item.title) ?? ''),
  )
  const insights: Insight[] = []
  const aiProduct = productFacts.find((item) =>
    /\bai\b|artificial intelligence/i.test(
      `${text(item.name) ?? ''} ${text(item.description) ?? ''}`,
    ),
  )
  const biologicalProduct = productFacts.find(
    (item) =>
      item !== aiProduct &&
      /cell|therapeutic|biologic|drug/i.test(
        `${text(item.name) ?? ''} ${text(item.description) ?? ''}`,
      ),
  )

  if (aiProduct && biologicalProduct) {
    insights.push(
      insight(
        'Hybrid therapeutic platform',
        `${companyName} combines ${text(biologicalProduct.name)} with ${text(aiProduct.name)}.`,
        'The company is positioned as a biotechnology platform with both a physical therapeutic-delivery modality and an AI-assisted discovery layer, rather than as a standalone AI software vendor.',
        'high',
        ['facts.company.description', 'facts.productsAndServices'],
        ['Product descriptions are profile claims and do not establish clinical efficacy.'],
      ),
    )
  }

  if (latestRound?.amount && totalFunding && latestRoundSharePercent !== undefined) {
    const roundCoverageCaveats =
      reportedRoundCount !== undefined && reportedRoundCount !== roundFacts.length
        ? [
            `Crunchbase reports ${reportedRoundCount} rounds but provides ${roundFacts.length} detailed rows.`,
          ]
        : undefined
    insights.push(
      insight(
        'Funding is concentrated in the latest major round',
        `The latest disclosed ${latestRound.type ?? 'funding'} round raised ${formatMoney(latestRound.amount)}, or ${latestRoundSharePercent}% of reported total funding.`,
        'This round accounts for most reported historical financing, making it important when assessing funding-source concentration and fundraising cadence.',
        'high',
        ['facts.funding.totalRaised', 'facts.funding.rounds.0', 'derivedMetrics.latestRoundShareOfTotalPercent'],
        roundCoverageCaveats,
      ),
    )
  }

  if (grantRounds.length && grantFundingAmount && grantSharePercent !== undefined) {
    insights.push(
      insight(
        'Meaningful non-dilutive funding',
        `${grantRounds.length} disclosed grants total ${formatMoney({ amount: grantFundingAmount, currency: totalFunding?.currency ?? 'USD' })}, representing ${grantSharePercent}% of reported funding.`,
        'The grants reduce the share of reported financing attributed to equity or notes, although their restrictions and milestone requirements need separate verification.',
        'high',
        ['facts.funding.rounds', 'derivedMetrics.grantFunding'],
      ),
    )
  }

  if (valuationMultiple && earliestValuation && latestValuation) {
    insights.push(
      insight(
        'Valuation increased across disclosed rounds',
        `Known post-money valuation rose from ${formatMoney(earliestValuation)} to ${formatMoney(latestValuation)}, a ${valuationMultiple}x increase.`,
        'The disclosed financing history indicates a material valuation step-up between the earliest and latest rounds with known valuations.',
        'medium',
        ['facts.funding.rounds', 'derivedMetrics.latestToEarliestKnownValuationMultiple'],
        ['Only rounds with a disclosed post-money valuation are compared.'],
      ),
    )
  }

  const growthScore = finiteNumber(growthAndHeat.growth_score)
  const growthChange = finiteNumber(growthAndHeat.growth_score_delta_d90)
  const heatScore = finiteNumber(growthAndHeat.heat_score)
  const heatChange = finiteNumber(growthAndHeat.heat_score_delta_d90)
  if (
    growthScore !== undefined &&
    growthChange !== undefined &&
    heatScore !== undefined &&
    heatChange !== undefined
  ) {
    insights.push(
      insight(
        'Sharp recent attention and growth momentum',
        `Crunchbase scores growth at ${growthScore} (${growthChange >= 0 ? '+' : ''}${growthChange} over 90 days) and market heat at ${heatScore} (${heatChange >= 0 ? '+' : ''}${heatChange}).`,
        'The company has recently become much more visible, but the scores should be treated as attention/activity indicators rather than revenue or clinical-performance metrics.',
        'medium',
        ['providerSignals.crunchbaseMomentum', 'facts.recentNews'],
        ['Crunchbase does not expose the complete weighting behind these proprietary scores.'],
      ),
    )
  }

  if (formerName || ipoNews.length) {
    const rebrandClause = formerName
      ? `${formerName} became ${companyName}${text(rebrandNews?.date) ? ` on ${text(rebrandNews?.date)}` : ''}`
      : `${companyName} has a recent strategic-positioning change`
    const ipoClause = ipoNews.length
      ? `${ipoNews.length} recent unique news titles explicitly contain the English terms IPO or listing`
      : 'no IPO coverage is present in the loaded news subset'
    insights.push(
      insight(
        'Strategic repositioning and listing coverage shape the current narrative',
        `${rebrandClause}; ${ipoClause}.`,
        'Their timing coincides with increased visibility in the loaded news and Crunchbase momentum signals, but the data does not establish causation.',
        'medium',
        ['facts.company.formerName', 'facts.recentNews', 'providerSignals.crunchbaseMomentum'],
        ['The causal link to Crunchbase momentum is an inference from timing, not a disclosed company metric.'],
      ),
    )
  }

  const ipoProbability = finiteNumber(
    read(modelPredictions, 'ipo', 'probabilityPercent'),
  )
  if (ipoNews.length && ipoProbability !== undefined) {
    insights.push(
      insight(
        'IPO intent and modeled likelihood conflict',
        `Recent headline metadata discusses an IPO or listing, while Crunchbase’s model assigns a ${ipoProbability}% IPO probability.`,
        'Publicly discussed intent should not be treated as proof of execution; the conflict is a useful diligence flag for verifying filing status, timing, and exchange readiness.',
        'medium',
        ['facts.recentNews', 'providerSignals.modelPredictions.ipo'],
        ['The prediction is an opaque model output and may lag current company plans.'],
      ),
    )
  }

  if (similarCompanies.length >= 3) {
    const peerNames = similarCompanies
      .slice(0, 3)
      .map((item) => text(item.name))
      .filter((value): value is string => Boolean(value))
    insights.push(
      insight(
        'Competitive benchmark reflects the modeled peer set',
        `Crunchbase’s closest modeled peers include ${peerNames.join(', ')}.`,
        'These matches provide a starting point for comparing differentiation, scale, and shared specialties, but they should not be treated as a verified competitor set.',
        'medium',
        ['providerSignals.similarCompanies', 'facts.productsAndServices'],
        ['Similarity scores are algorithmic matches, not verified direct competitors.'],
      ),
    )
  }

  const qualityIssues: UnknownRecord[] = []
  if (
    reportedRoundCount !== undefined &&
    reportedRoundCount !== roundFacts.length
  ) {
    qualityIssues.push({
      severity: 'medium',
      finding: `Crunchbase reports ${reportedRoundCount} funding rounds but supplies ${roundFacts.length} detailed rows.`,
      impact: 'The detailed round history is incomplete.',
    })
  }
  if (unattributedFundingAmount && unattributedFundingAmount > 0) {
    qualityIssues.push({
      severity: 'medium',
      finding: `Disclosed detailed amounts total ${formatMoney({ amount: knownDetailedFundingAmount, currency: totalFunding?.currency ?? 'USD' })}, leaving ${formatMoney({ amount: unattributedFundingAmount, currency: totalFunding?.currency ?? 'USD' })} of reported funding unattributed.`,
      impact: 'Do not invent or assign the missing amount to a round.',
    })
  }
  if (
    reportedInvestorCount !== undefined &&
    investorMap.size === reportedInvestorCount
  ) {
    const attributedInvestorCount = [...investorMap.values()].filter(
      (item) => item.rounds.size,
    ).length
    if (attributedInvestorCount < investorMap.size) {
      qualityIssues.push({
        severity: 'low',
        finding: `${reportedInvestorCount} investors are named, but detailed round attribution is available for only ${attributedInvestorCount}.`,
        impact: 'Unattributed investors remain listed without an inferred round relationship.',
      })
    }
  }
  const reportedNewsCount = finiteNumber(timeline.count)
  if (
    reportedNewsCount !== undefined &&
    reportedNewsCount > newsItems.length
  ) {
    qualityIssues.push({
      severity: 'low',
      finding: `Crunchbase reports ${reportedNewsCount} timeline items but exposes ${newsItems.length} unique items in this payload.`,
      impact: 'Recent news is a partial sample, not a complete history.',
    })
  }

  const researchSummary = text(
    read(cards.research_insight_text_link, 'research_insight_description'),
  )
  if (researchSummary && formerName && researchSummary.includes(formerName)) {
    qualityIssues.push({
      severity: 'low',
      finding: `The AI-generated research summary uses the former name ${formerName}.`,
      impact: 'Treat the summary as historical continuity, not as independently verified current positioning.',
    })
  }

  const founded = asRecord(overview.founded_on)
  const foundedValue = text(founded?.value)
  const foundedPrecision = text(founded?.precision)
  const foundedYear =
    foundedValue && foundedPrecision === 'year'
      ? Number(foundedValue.slice(0, 4))
      : undefined

  const output = compact({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      provider: 'Crunchbase',
      scrapedAt: text(root.scrapedAt),
      url: cleanUrl(root.sourceUrl),
    },
    methodology: {
      facts: 'Strict allowlist of company-facing fields from the authenticated organization payload.',
      insights: 'Deterministic calculations and evidence-linked interpretations; no external facts were added.',
      limitation: 'Crunchbase profile data, third-party models, and company descriptions were not independently verified.',
    },
    facts: {
      company: {
        name: companyName,
        formerName,
        shortDescription: text(properties.short_description),
        description: text(read(cards.overview_description, 'description')),
        website: cleanUrl(read(companyAbout.website, 'value')),
        foundedYear,
        operatingStatus: humanizeEnum(overview.operating_status),
        ownershipStatus: humanizeEnum(companyAbout.ipo_status),
        companyType: humanizeEnum(companyFields.company_type),
        employeeRange: employeeRange(companyAbout.num_employees_enum),
        estimatedRevenueRange: revenueRanges[text(overview.revenue_range) ?? ''],
        headquarters: headquarters || undefined,
        geographicRegions: namesOf(overview.location_group_identifiers),
        industries: namesOf(overview.categories),
        sectors: namesOf(properties.category_groups),
        founders: namesOf(overview.founder_identifiers),
      },
      productsAndServices: productFacts,
      funding: {
        totalRaised: totalFunding,
        reportedRoundCount,
        detailedRoundCount: roundFacts.length,
        lastFundingDate: text(fundingSummary.last_funding_at),
        lastFundingType: humanizeEnum(fundingSummary.last_funding_type),
        rounds: roundFacts,
        investors: {
          reportedCount: reportedInvestorCount,
          visibleNames: investors,
        },
      },
      recentNews: {
        reportedCount: reportedNewsCount,
        includedUniqueCount: newsItems.length,
        items: newsItems,
      },
    },
    derivedMetrics: {
      disclosedAmountRoundCount,
      knownDetailedFundingAmount: totalFunding
        ? { amount: knownDetailedFundingAmount, currency: totalFunding.currency }
        : undefined,
      fundingAmountCoveragePercent: fundingCoveragePercent,
      unattributedFundingAmount:
        unattributedFundingAmount && totalFunding
          ? { amount: unattributedFundingAmount, currency: totalFunding.currency }
          : undefined,
      latestRoundShareOfTotalPercent: latestRoundSharePercent,
      grantFunding:
        grantRounds.length && totalFunding
          ? {
              amount: { amount: grantFundingAmount, currency: totalFunding.currency },
              disclosedRoundCount: grantRounds.length,
              shareOfTotalPercent: grantSharePercent,
            }
          : undefined,
      latestToEarliestKnownValuationMultiple: valuationMultiple,
    },
    providerSignals: {
      note: 'The following are Crunchbase-generated or algorithmic signals, not verified company facts.',
      reportedPartnerships: partnershipFacts.length
        ? {
            note: 'Provider event summaries with linked sources; not independently verified.',
            items: partnershipFacts,
          }
        : undefined,
      crunchbaseMomentum: momentum,
      modelPredictions,
      similarCompanies: {
        description: 'Top five algorithmic similarity matches; not verified direct competitors.',
        companies: similarCompanies,
      },
      aiResearchSummary: researchSummary
        ? {
            formerNameContext: formerName,
            notFact: true,
            text: researchSummary,
          }
        : undefined,
    },
    insights,
    dataQuality: {
      overallAssessment:
        'Core company and funding facts are usable with caveats; detailed lists are partial and model-generated signals are provisional.',
      issues: qualityIssues,
      intentionallyOmitted: [
        'Browser session, account, authentication, and internal page metadata',
        'UUIDs, permalinks, image references, entity wrappers, and layout fields',
        'Semrush traffic/location estimates because the sample is extremely small and geographic shares are inconsistent',
        'Aberdeen IT-spend estimate because its date and methodology are not supplied',
        'Empty cards and chart-history arrays',
      ],
    },
  })

  const sanitizedOutput = redactEmailAddresses(output)
  assertInsightsAreClean(sanitizedOutput)
  return sanitizedOutput as UnknownRecord
}
