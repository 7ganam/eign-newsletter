import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLinkedInFollowerExtractor,
  consolidateFollowerObservations,
  parseFollowerText,
  parseLinkedInProfileUrl,
  validateLinkedInFollowerResult,
} from './linkedin-followers'

test('accepts locale LinkedIn hosts and canonicalizes profile URLs', () => {
  assert.deepEqual(
    parseLinkedInProfileUrl('https://sa.linkedin.com/in/ziad-musallam-99576162/?trk=profile'),
    {
      canonicalUrl: 'https://www.linkedin.com/in/ziad-musallam-99576162',
      slug: 'ziad-musallam-99576162',
    },
  )
  assert.deepEqual(
    parseLinkedInProfileUrl('https://qa.linkedin.com/in/soumaya-ben-beya-dridje-25574466/fr'),
    {
      canonicalUrl: 'https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466',
      slug: 'soumaya-ben-beya-dridje-25574466',
    },
  )
  assert.throws(
    () => parseLinkedInProfileUrl('https://www.linkedin.com/company/linkedin/'),
    /form/,
  )
  assert.throws(
    () => parseLinkedInProfileUrl('https://example.com/in/example/'),
    /LinkedIn/,
  )
})

test('parses exact and rounded follower labels', () => {
  assert.deepEqual(parseFollowerText('1,993 followers'), {
    count: 1993,
    precision: 'exact',
    text: '1,993 followers',
  })
  assert.deepEqual(parseFollowerText('35,455 followers'), {
    count: 35455,
    precision: 'exact',
    text: '35,455 followers',
  })
  assert.deepEqual(parseFollowerText('  1.9K\u00a0followers '), {
    count: 1900,
    precision: 'rounded',
    text: '1.9K followers',
  })
  assert.equal(parseFollowerText('500+ connections'), null)
})

test('supports the Activity and profile-header placements', () => {
  assert.deepEqual(
    consolidateFollowerObservations([
      { location: 'activity', text: '1,993 followers' },
    ]),
    {
      count: 1993,
      displayText: '1,993 followers',
      locations: ['activity'],
      precision: 'exact',
      source: 'linkedin-profile',
    },
  )
  assert.deepEqual(
    consolidateFollowerObservations([
      { location: 'profile-header', text: '35,455 followers' },
      { location: 'activity', text: '35,455 followers' },
    ]),
    {
      count: 35455,
      displayText: '35,455 followers',
      locations: ['profile-header', 'activity'],
      precision: 'exact',
      source: 'linkedin-profile',
    },
  )
  assert.throws(
    () => consolidateFollowerObservations([
      { location: 'profile-header', text: '35,455 followers' },
      { location: 'activity', text: '35,456 followers' },
    ]),
    /conflicting/,
  )
})

test('builds class-name-independent DOM extraction and validates its result', () => {
  const target = parseLinkedInProfileUrl(
    'https://www.linkedin.com/in/wafa-al-obaidat-8a992046/',
  )
  const extractor = buildLinkedInFollowerExtractor(target, 'Microsoft Edge')
  assert.match(extractor, /profile-header/)
  assert.match(extractor, /activity/)
  assert.match(extractor, /querySelectorAll\('p,span,div'\)/)
  assert.doesNotMatch(extractor, /_02484ad3|_61558a10|f76ab44a|da2c3a6b/)

  const rawResult = JSON.stringify({
    schemaVersion: 'linkedin-followers.v1',
    sourceUrl: 'https://www.linkedin.com/in/wafa-al-obaidat-8a992046/',
    canonicalProfileUrl: target.canonicalUrl,
    profileSlug: target.slug,
    profileName: 'Wafa Al Obaidat',
    pageTitle: 'Wafa Al Obaidat | LinkedIn',
    observedAt: '2026-09-01T00:00:00.000Z',
    followers: {
      count: 35455,
      displayText: '35,455 followers',
      locations: ['profile-header', 'activity'],
      precision: 'exact',
      source: 'linkedin-profile',
    },
    extraction: {
      method: 'visible-profile-dom',
      browser: 'Microsoft Edge',
    },
  })
  assert.equal(validateLinkedInFollowerResult(rawResult, target).followers.count, 35455)
})
