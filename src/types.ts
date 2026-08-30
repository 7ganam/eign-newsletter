export type Summary = {
  companies: number
  rounds: number
  totalFundingUsd: number
  fundedCompanies: number
  reconciledCompanies: number
  updatedAt: string | null
}

export type IndustryDatum = {
  industry: string
  companies: number
  fundingUsd: number
}

export type BatchDatum = {
  batch: string
  companies: number
  fundingUsd: number
}

export type TimelineDatum = {
  month: string
  fundingUsd: number
  rounds: number
}

export type StageDatum = {
  stage: string
  rounds: number
  fundingUsd: number
}

export type RankedCompany = {
  name: string
  slug: string
  logoUrl?: string | null
  industry?: string | null
  batch?: string | null
  totalFundingUsd?: number | null
}

export type RecentRound = {
  companySlug: string
  companyName: string
  logoUrl?: string | null
  round?: string | null
  roundStage?: string | null
  amountUsd?: number | null
  announcementDate?: string | null
}

export type DashboardData = {
  summary: Summary
  industries: IndustryDatum[]
  batches: BatchDatum[]
  timeline: TimelineDatum[]
  stages: StageDatum[]
  topCompanies: RankedCompany[]
  recentRounds: RecentRound[]
}

export type FundingLandscapeCompany = {
  name: string
  slug?: string | null
  logoUrl?: string | null
  website?: string | null
  fundingUsd: number
  fundingTotalType: string
  primaryFundingBasis: string
  aggregatedCompanyCount?: number
}

export type FundingLandscapeIndustry = {
  name: string
  companyCount: number
  fundingUsd: number
  companies: FundingLandscapeCompany[]
}

export type FundingLandscapeResponse = {
  summary: {
    companyCount: number
    fundedCompanyCount: number
    totalFundingUsd: number
    namedCompanyCount: number
    aggregatedCompanyCount: number
  }
  industries: FundingLandscapeIndustry[]
}

export type LatestRound = {
  amountUsd?: number | null
  announcementDate?: string | null
  roundStage?: string | null
}

export type CompanyListItem = {
  name: string
  slug: string
  logoUrl?: string | null
  industry?: string | null
  businessType?: string | null
  batch?: string | null
  totalFundingUsd?: number | null
  fundingTotalType?: string | null
  fundingReconciliationStatus?: string | null
  summary?: string | null
  website?: string | null
  roundCount: number
  latestRound?: LatestRound | null
}

export type CompanyListResponse = {
  items: CompanyListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export type FundingRound = {
  amountUsd?: number | null
  announcementDate?: string | null
  evidenceBasis?: string | null
  includedInTotal?: boolean | null
  inferredMinimum?: boolean | null
  instrument?: string | null
  leadInvestors?: string | string[] | null
  otherInvestors?: string | string[] | null
  notionUrl?: string | null
  primarySource?: string | null
  secondarySource?: string | null
  recordType?: string | null
  round?: string | null
  roundStage?: string | null
  verification?: string | null
}

export type CompanyDetailResponse = {
  company: CompanyListItem & {
    acceleratorProgram?: string | null
    fundingHistoryCompleteness?: string | null
    fundingSources?: string | null
    fundingReconciliationNote?: string | null
    notionUrl?: string | null
    primaryFundingBasis?: string | null
    verifiedFundingEventsTotalUsd?: number | null
    unexplainedFundingUsd?: number | null
  }
  rounds: FundingRound[]
}
