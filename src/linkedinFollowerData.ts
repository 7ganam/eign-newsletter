import { INFLUENCERS } from './influencerData'

export type LinkedInFollowerSnapshot = {
  count: number | null
  observedAt: string | null
  status: 'observed' | 'not-verified'
  precision?: 'exact' | 'rounded'
  source?: 'linkedin-profile' | 'search-index'
}

export const LINKEDIN_FOLLOWERS_UPDATED_AT = '2026-08-30' as const

const LINKEDIN_PROFILE_OBSERVED_AT = '2026-08-30' as const
const SEARCH_INDEX_OBSERVED_AT = '2026-08-28' as const

// Indexed LinkedIn results can lag the live profile. Rounded values are kept as
// estimates, and ambiguous identities stay null rather than borrowing a count.
const FOLLOWER_COUNTS = [
  42451, 16611, 5408, 14867, 10388, 19575, 2366, 9087, 24653, 22224, 13413, 30973,
  31151, 18402, 9466, 4791, 32398, 27929, 7032, 14290, 3754, 3754, 4101, 4101,
  6257, 3844, 4338, 4338, 4726, 14960, 4607, 11213, 8098, 463063, 14445, 19144,
  29404, 10187, 48004, 10512, 5943, 5439, 121505, 921, 4854, 10880, 22808, 16110,
  22224, 12192, 12933, 58788, 1788, 11246, 44408, 6245, 14593, 15599, 198702, 10568,
  42129, 4662, 28346, 19405, 15015, 2707, 4580, 20347, 1250, 8721, 37775, 2356,
  8224, 4214, 414587, 50967, 11017, 10158, 4203, 9357, 71414, 747360, 6226, 12300,
  6825, 41578, 33326, 5955, 571, 22551, 30397, 32743, 15166, 13671, 4168, 18815,
  6581, 48998, 2807, 19743, 3815, 17308, 3527, 24943, 1598, 1598, 135525, 6259,
  17393, 6803, 1509, 15859, 2186, 20937, 3279, 31228, null, 24593, 5202, 35348, 9433,
  null, 5837, 7444, 2718, null, 739, 13378, 7348, 4810, 2688, null, 6187, 4683, null,
  28054, 3743, 7745, 7296, 1207, 4791, 6142, 1052, 24768,
] as const satisfies readonly (number | null)[]

const REFRESHED_PROFILE_INDEXES = new Set(
  [
    ...Array.from({ length: 114 }, (_, zeroBasedIndex) => zeroBasedIndex + 1),
    118, 123, 127, 133,
  ],
)

const LIVE_PROFILE_INDEXES = new Set([...REFRESHED_PROFILE_INDEXES, 116])

const ROUNDED_INDEXES = new Set<number>()

export const LINKEDIN_FOLLOWERS: Record<string, LinkedInFollowerSnapshot> = Object.fromEntries(
  INFLUENCERS.map((influencer, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1
    const count = FOLLOWER_COUNTS[zeroBasedIndex] ?? null
    const observed = count != null
    const liveProfile = LIVE_PROFILE_INDEXES.has(index)
    const refreshedProfile = REFRESHED_PROFILE_INDEXES.has(index)

    return [influencer.linkedinUrl, {
      count,
      observedAt: observed
        ? refreshedProfile
          ? LINKEDIN_PROFILE_OBSERVED_AT
          : SEARCH_INDEX_OBSERVED_AT
        : null,
      status: observed ? 'observed' : 'not-verified',
      precision: observed && ROUNDED_INDEXES.has(index) ? 'rounded' : observed ? 'exact' : undefined,
      source: observed && liveProfile ? 'linkedin-profile' : observed ? 'search-index' : undefined,
    }]
  }),
)
