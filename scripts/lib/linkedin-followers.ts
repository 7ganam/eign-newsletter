export const LINKEDIN_WAIT_PREFIX = '__LINKEDIN_FOLLOWERS_WAIT__:'
export const LINKEDIN_ERROR_PREFIX = '__LINKEDIN_FOLLOWERS_ERROR__:'

export type LinkedInFollowerLocation = 'activity' | 'profile-header'

export type LinkedInFollowerObservation = {
  location: LinkedInFollowerLocation
  text: string
}

export type ParsedFollowerText = {
  count: number
  precision: 'exact' | 'rounded'
  text: string
}

export type LinkedInFollowerResult = {
  canonicalProfileUrl: string
  extraction: {
    browser: string
    method: 'visible-profile-dom'
  }
  followers: {
    count: number
    displayText: string
    locations: LinkedInFollowerLocation[]
    precision: 'exact' | 'rounded'
    source: 'linkedin-profile'
  }
  observedAt: string
  pageTitle: string
  profileName: string
  profileSlug: string
  schemaVersion: 'linkedin-followers.v1'
  sourceUrl: string
}

export type LinkedInProfileTarget = {
  canonicalUrl: string
  slug: string
}

const normalizeFollowerText = (value: string) => value
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function parseLinkedInProfileUrl(value: string): LinkedInProfileTarget {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    !/(^|\.)linkedin\.com$/i.test(url.hostname)
  ) {
    throw new Error('The URL must be an HTTPS LinkedIn profile URL')
  }

  const match = url.pathname.match(/^\/in\/([^/]+)(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/?$/i)
  if (!match) {
    throw new Error('The URL must have the form https://www.linkedin.com/in/<profile-slug>')
  }

  const encodedSlug = match[1]
  const slug = decodeURIComponent(encodedSlug)
  return {
    canonicalUrl: `https://www.linkedin.com/in/${encodedSlug}`,
    slug,
  }
}

export function parseFollowerText(value: string): ParsedFollowerText | null {
  const text = normalizeFollowerText(value)
  const match = text.match(
    /^((?:\d{1,3}(?:[,.\s]\d{3})+|\d+)(?:[.,]\d+)?)([KMB])?\+?\s+followers$/i,
  )
  if (!match) return null

  const suffix = match[2]?.toUpperCase()
  if (!suffix) {
    const count = Number(match[1].replace(/\D/g, ''))
    if (!Number.isSafeInteger(count)) return null
    return { count, precision: 'exact', text }
  }

  const numericValue = Number(match[1].replace(/\s/g, '').replace(',', '.'))
  const multiplier = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : 1_000_000_000
  const count = Math.round(numericValue * multiplier)
  if (!Number.isSafeInteger(count)) return null
  return { count, precision: 'rounded', text }
}

export function consolidateFollowerObservations(
  observations: LinkedInFollowerObservation[],
) {
  const parsed = observations.flatMap((observation) => {
    const followerValue = parseFollowerText(observation.text)
    return followerValue ? [{ ...followerValue, location: observation.location }] : []
  })
  if (!parsed.length) {
    throw new Error('No supported LinkedIn follower count was found')
  }

  const uniqueCounts = new Set(parsed.map((observation) => observation.count))
  if (uniqueCounts.size !== 1) {
    throw new Error('LinkedIn displayed conflicting follower counts on the profile')
  }

  const selected = parsed.find((observation) => observation.location === 'profile-header') ?? parsed[0]
  const locations = [...new Set(parsed.map((observation) => observation.location))]
    .sort((left, right) => left === right ? 0 : left === 'profile-header' ? -1 : 1)

  return {
    count: selected.count,
    displayText: selected.text,
    locations,
    precision: selected.precision,
    source: 'linkedin-profile' as const,
  }
}

export function buildLinkedInFollowerExtractor(
  target: LinkedInProfileTarget,
  browserName: string,
) {
  const expectedPathSlug = new URL(target.canonicalUrl).pathname.split('/')[2]
  return `(() => {
    const waitPrefix = ${JSON.stringify(LINKEDIN_WAIT_PREFIX)};
    const errorPrefix = ${JSON.stringify(LINKEDIN_ERROR_PREFIX)};
    const expectedSlug = ${JSON.stringify(target.slug)};
    const expectedPathSlug = ${JSON.stringify(expectedPathSlug)};
    const canonicalProfileUrl = ${JSON.stringify(target.canonicalUrl)};
    const browserName = ${JSON.stringify(browserName)};
    const pageText = document.body ? document.body.innerText : '';

    if (
      /authwall|checkpoint|login/i.test(location.pathname) ||
      /sign in to linkedin|join linkedin/i.test(pageText)
    ) {
      return errorPrefix + 'The selected browser is not logged in to LinkedIn';
    }
    if (
      /security verification|unusual activity|temporarily restricted/i.test(pageText)
    ) {
      return errorPrefix + 'LinkedIn is showing a security or restriction page';
    }

    const currentMatch = location.pathname.match(/^\\/in\\/([^/]+)\\/?$/i);
    if (!currentMatch) {
      return waitPrefix + 'The LinkedIn profile has not loaded yet';
    }
    if (currentMatch[1].toLowerCase() !== expectedPathSlug.toLowerCase()) {
      return errorPrefix + 'LinkedIn opened a different profile than the requested URL';
    }

    const main = document.querySelector('main');
    const profileHeading = main && main.querySelector('h1,h2,[role="heading"]');
    if (!main || !profileHeading) {
      return waitPrefix + 'The LinkedIn profile content is not available yet';
    }

    const normalize = (value) => String(value || '')
      .replace(/\\u00a0/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
    const followerPattern = /^((?:\\d{1,3}(?:[,.\\s]\\d{3})+|\\d+)(?:[.,]\\d+)?)([KMB])?\\+?\\s+followers$/i;
    const matchesFollowerText = (element) => followerPattern.test(normalize(element.textContent));
    const isRendered = (element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.getClientRects().length > 0;
    };
    const exactHeadings = (element) => Array.from(
      element.querySelectorAll('h1,h2,h3,[role="heading"]')
    ).map((heading) => normalize(heading.textContent));
    const classify = (element) => {
      let ancestor = element;
      while (ancestor && ancestor !== main) {
        const headings = exactHeadings(ancestor);
        if (headings.length) {
          if (normalize(ancestor.innerText).length > 2000) return null;
          if (headings.some((heading) => /^activity$/i.test(heading))) {
            return 'activity';
          }
          if (headings.some((heading) => heading === normalize(profileHeading.textContent))) {
            return 'profile-header';
          }
          return null;
        }
        ancestor = ancestor.parentElement;
      }
      return null;
    };
    const parseCount = (text) => {
      const match = normalize(text).match(followerPattern);
      if (!match) return null;
      const suffix = match[2] ? match[2].toUpperCase() : '';
      if (!suffix) {
        const count = Number(match[1].replace(/\\D/g, ''));
        return Number.isSafeInteger(count)
          ? { count, precision: 'exact', text: normalize(text) }
          : null;
      }
      const numericValue = Number(match[1].replace(/\\s/g, '').replace(',', '.'));
      const multiplier = suffix === 'K'
        ? 1000
        : suffix === 'M'
          ? 1000000
          : 1000000000;
      const count = Math.round(numericValue * multiplier);
      return Number.isSafeInteger(count)
        ? { count, precision: 'rounded', text: normalize(text) }
        : null;
    };

    const candidateElements = Array.from(main.querySelectorAll('p,span,div'))
      .filter(matchesFollowerText)
      .filter((element) => !Array.from(element.children).some(matchesFollowerText))
      .filter(isRendered);
    const observations = candidateElements.flatMap((element) => {
      const location = classify(element);
      const parsed = parseCount(element.textContent);
      return location && parsed ? [{ ...parsed, location }] : [];
    });

    if (!observations.length) {
      return waitPrefix + 'No follower count is visible in the profile header or Activity section yet';
    }

    const uniqueCounts = new Set(observations.map((observation) => observation.count));
    if (uniqueCounts.size !== 1) {
      return errorPrefix + 'LinkedIn displayed conflicting follower counts on the profile';
    }

    const selected = observations.find(
      (observation) => observation.location === 'profile-header'
    ) || observations[0];
    const locations = Array.from(new Set(
      observations.map((observation) => observation.location)
    )).sort((left, right) =>
      left === right ? 0 : left === 'profile-header' ? -1 : 1
    );

    return JSON.stringify({
      schemaVersion: 'linkedin-followers.v1',
      sourceUrl: location.href,
      canonicalProfileUrl,
      profileSlug: expectedSlug,
      profileName: normalize(profileHeading.textContent),
      pageTitle: document.title,
      observedAt: new Date().toISOString(),
      followers: {
        count: selected.count,
        displayText: selected.text,
        locations,
        precision: selected.precision,
        source: 'linkedin-profile',
      },
      extraction: {
        method: 'visible-profile-dom',
        browser: browserName,
      },
    });
  })()`
}

export function validateLinkedInFollowerResult(
  rawResult: string,
  target: LinkedInProfileTarget,
): LinkedInFollowerResult {
  let result: LinkedInFollowerResult
  try {
    result = JSON.parse(rawResult) as LinkedInFollowerResult
  } catch (error) {
    throw new Error(`The browser returned invalid LinkedIn follower JSON: ${String(error)}`)
  }

  if (
    result.schemaVersion !== 'linkedin-followers.v1' ||
    result.profileSlug.toLowerCase() !== target.slug.toLowerCase() ||
    result.canonicalProfileUrl !== target.canonicalUrl
  ) {
    throw new Error('The browser returned follower data for a different LinkedIn profile')
  }
  if (
    !Number.isSafeInteger(result.followers?.count) ||
    result.followers.count < 0 ||
    !result.followers.locations.length ||
    result.followers.source !== 'linkedin-profile'
  ) {
    throw new Error('The browser returned an invalid LinkedIn follower count')
  }

  const parsedDisplayText = parseFollowerText(result.followers.displayText)
  if (!parsedDisplayText || parsedDisplayText.count !== result.followers.count) {
    throw new Error('The browser follower text does not match the numeric count')
  }

  return result
}
