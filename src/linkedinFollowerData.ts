import { INFLUENCERS } from './influencerData'

export type LinkedInFollowerSnapshot = {
  count: number | null
  observedAt: string | null
  status: 'observed' | 'not-verified'
  precision?: 'exact' | 'rounded'
  source?: 'linkedin-profile' | 'search-index'
}

export const LINKEDIN_FOLLOWERS_UPDATED_AT = '2026-08-28' as const

// Indexed LinkedIn results can lag the live profile. Rounded values are kept as
// estimates, and ambiguous identities stay null rather than borrowing a count.
const FOLLOWER_COUNTS = [
  42440, 16609, 5404, 14861, 10385, 19552, 2367, 9078, 24648, 22217, 13403, 30925,
  30542, 18000, 9000, 4773, 32000, 28000, 7000, 14000, 4000, 3000, 4000, 8000,
  6163, 4000, 4000, 11101, 4691, 15000, 5000, 11000, 8000, 462000, 14080, 19002,
  29000, 10029, 47253, 11000, 6000, 5000, 121000, 915, 4847, 10387, 23000, 16000,
  22000, 11805, 12613, 58302, 2000, 10999, 44000, 6000, 14402, 15480, 191528, 10565,
  41704, 4608, 27606, 19000, null, 3000, 4576, 20256, 1233, 8341, 37296, 2000,
  8192, 4000, 411512, 51000, 10949, 10092, 4176, 8977, 71357, 747000, 6090, 12000,
  6794, 42000, 33000, 5827, 571, 22001, 30000, 32728, 15090, 14000, 4000, 18242,
  6535, 48711, null, 20000, 3632, 17060, null, 24755, null, 14536, 128862, 5789,
  17177, 6753, null, null, 2167, null, 3279, 31228, null, 28745, 5202, 35348, 9433,
  null, 22158, 7444, 2718, null, null, 13378, 7348, 4810, 2688, null, 2290, 4683, null,
  28054, 3743, 7745, 7296, 1207, 4791, 6142, 1052, 24768,
] as const satisfies readonly (number | null)[]

const LIVE_PROFILE_INDEXES = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 45, 60, 81, 92, 116,
])

const ROUNDED_INDEXES = new Set([
  14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 30, 31, 32, 33, 34, 37,
  40, 41, 42, 43, 47, 48, 49, 53, 55, 56, 64, 66, 72, 74, 76, 82, 84, 86,
  87, 91, 94, 95, 100,
])

export const LINKEDIN_FOLLOWERS: Record<string, LinkedInFollowerSnapshot> = Object.fromEntries(
  INFLUENCERS.map((influencer, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1
    const count = FOLLOWER_COUNTS[zeroBasedIndex] ?? null
    const observed = count != null

    return [influencer.linkedinUrl, {
      count,
      observedAt: observed ? LINKEDIN_FOLLOWERS_UPDATED_AT : null,
      status: observed ? 'observed' : 'not-verified',
      precision: observed && ROUNDED_INDEXES.has(index) ? 'rounded' : observed ? 'exact' : undefined,
      source: observed && LIVE_PROFILE_INDEXES.has(index) ? 'linkedin-profile' : observed ? 'search-index' : undefined,
    }]
  }),
)
