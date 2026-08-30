import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  assertInsightsAreClean,
  buildCrunchbaseInsights,
} from './lib/crunchbase-insights'

const DEFAULT_URL =
  'https://www.crunchbase.com/organization/axiom-biosciences'
const WAIT_PREFIX = '__CRUNCHBASE_WAIT__:'
const ERROR_PREFIX = '__CRUNCHBASE_ERROR__:'

type CliOptions = {
  help: boolean
  keepOpen: boolean
  outputPath: string
  slug: string
  timeoutMs: number
  url: string
}

type ScrapeResult = {
  extraction: {
    authenticated: boolean
    method: string
  }
  organization: {
    cards?: Record<string, unknown>
    properties?: {
      identifier?: {
        permalink?: string
        uuid?: string
        value?: string
      }
    }
  }
  pageTitle: string
  scrapedAt: string
  sourceUrl: string
}

function usage() {
  return `Usage:
  pnpm scrape:crunchbase [organization-url] [options]

Options:
  -o, --output <path>   JSON output path
      --keep-open       Leave the Edge tab open after scraping
      --timeout <ms>    Page timeout in milliseconds (default: 90000)
  -h, --help            Show this help

Examples:
  pnpm scrape:crunchbase
  pnpm scrape:crunchbase https://www.crunchbase.com/organization/axiom-biosciences
  pnpm scrape:crunchbase https://www.crunchbase.com/organization/stripe -o outputs/crunchbase/stripe.json

The script uses the currently running, logged-in Microsoft Edge session on macOS.
It never reads or writes browser cookies, profile files, or local storage, and it
does not export session, user, or authentication data. It checks only whether the
page reports that the current browser session is logged in.`
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function parseArgs(args: string[]): CliOptions {
  let requestedUrl = DEFAULT_URL
  let outputPath: string | undefined
  let timeoutMs = 90_000
  let keepOpen = false
  let help = false
  let hasUrlArgument = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '-h' || argument === '--help') {
      help = true
      continue
    }

    if (argument === '--keep-open') {
      keepOpen = true
      continue
    }

    if (argument === '-o' || argument === '--output') {
      outputPath = requireValue(args, index, argument)
      index += 1
      continue
    }

    if (argument === '--timeout') {
      const value = requireValue(args, index, argument)
      timeoutMs = Number(value)
      if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000) {
        throw new Error('--timeout must be a number of at least 1000 milliseconds')
      }
      index += 1
      continue
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    }

    if (hasUrlArgument) {
      throw new Error(`Unexpected argument: ${argument}`)
    }

    requestedUrl = argument
    hasUrlArgument = true
  }

  const parsedUrl = new URL(requestedUrl)
  if (
    parsedUrl.protocol !== 'https:' ||
    !['crunchbase.com', 'www.crunchbase.com'].includes(parsedUrl.hostname)
  ) {
    throw new Error('The URL must be an HTTPS Crunchbase organization page')
  }

  const match = parsedUrl.pathname.match(/^\/organization\/([^/]+)\/?$/)
  if (!match) {
    throw new Error('The URL must have the form https://www.crunchbase.com/organization/<slug>')
  }

  const slug = decodeURIComponent(match[1])
  const normalizedUrl = `https://www.crunchbase.com/organization/${encodeURIComponent(slug)}`
  const safeFilename = slug.replace(/[^a-zA-Z0-9._-]+/g, '-')

  return {
    help,
    keepOpen,
    outputPath: resolve(
      outputPath ?? `outputs/crunchbase/${safeFilename}.json`,
    ),
    slug,
    timeoutMs,
    url: normalizedUrl,
  }
}

function buildExtractor(slug: string) {
  const expectedSlug = JSON.stringify(slug)

  return `(() => {
    const waitPrefix = ${JSON.stringify(WAIT_PREFIX)};
    const errorPrefix = ${JSON.stringify(ERROR_PREFIX)};
    const expectedSlug = ${expectedSlug};
    const stateElement = document.querySelector('script#ng-state[type="application/json"]');

    if (!stateElement || !stateElement.textContent) {
      return waitPrefix + 'Crunchbase page state is not available yet';
    }

    let state;
    try {
      state = JSON.parse(stateElement.textContent);
    } catch (error) {
      return errorPrefix + 'Crunchbase page state is not valid JSON: ' + String(error);
    }

    const loggedInState = state.InitialAuthState && state.InitialAuthState.loggedInState;
    if (loggedInState !== 'logged-in') {
      return errorPrefix + 'The active Edge profile is not logged in to Crunchbase';
    }

    const httpState = state.HttpState && typeof state.HttpState === 'object'
      ? Object.values(state.HttpState)
      : [];
    const responses = httpState
      .filter((candidate) =>
        candidate &&
        candidate.status === 200 &&
        candidate.data &&
        candidate.data.properties &&
        candidate.data.properties.identifier &&
        candidate.data.properties.identifier.permalink === expectedSlug
      )
      .sort((left, right) =>
        Object.keys(right.data.cards || {}).length -
        Object.keys(left.data.cards || {}).length
      );
    const response = responses[0];

    if (!response || !response.data) {
      return waitPrefix + 'Organization payload is not available yet';
    }

    if (!response.data.cards || Object.keys(response.data.cards).length === 0) {
      return waitPrefix + 'Organization payload is incomplete';
    }

    return JSON.stringify({
      sourceUrl: location.href,
      pageTitle: document.title,
      scrapedAt: new Date().toISOString(),
      extraction: {
        method: 'edge-apple-events-ng-state',
        authenticated: loggedInState === 'logged-in',
      },
      organization: response.data,
    });
  })()`
}

const appleScript = String.raw`
on run argv
  set targetURL to item 1 of argv
  set extractionJavascript to item 2 of argv
  set keepOpenFlag to item 3 of argv
  set pollCount to (item 4 of argv) as integer
  set targetTab to missing value
  set targetWindow to missing value
  set previousWindow to missing value
  set previousTabID to missing value
  set didCreateTab to false
  set hadExistingWindow to false
  set lastResult to "${WAIT_PREFIX}Page has not finished loading"

  try
    tell application "Microsoft Edge"
      if (count of windows) is 0 then
        set targetWindow to make new window
      else
        set hadExistingWindow to true
        set previousWindow to front window
        set previousTabID to id of active tab of previousWindow
        set targetWindow to previousWindow
      end if

      tell targetWindow
        set targetTab to make new tab at end of tabs with properties {URL:targetURL}
        set didCreateTab to true
        set active tab index to (count of tabs)
      end tell

      repeat pollCount times
        if (loading of targetTab) is false then
          try
            set lastResult to execute targetTab javascript extractionJavascript
          on error scriptError
            set lastResult to "${WAIT_PREFIX}" & scriptError
          end try

          if lastResult starts with "${ERROR_PREFIX}" then
            error lastResult
          end if

          if lastResult does not start with "${WAIT_PREFIX}" then
            if keepOpenFlag is not "true" then
              if hadExistingWindow then
                close targetTab
                try
                  set restoreIndex to 0
                  set currentTabs to tabs of previousWindow
                  repeat with candidateIndex from 1 to (count of currentTabs)
                    if (id of item candidateIndex of currentTabs) is previousTabID then
                      set restoreIndex to candidateIndex
                      exit repeat
                    end if
                  end repeat
                  if restoreIndex is greater than 0 then
                    set active tab index of previousWindow to restoreIndex
                  end if
                  set index of previousWindow to 1
                end try
              else
                close targetWindow
              end if
              set didCreateTab to false
            end if
            return lastResult
          end if
        end if

        delay 0.25
      end repeat

      error "Timed out waiting for Crunchbase data. Last result: " & lastResult
    end tell
  on error errorMessage number errorNumber
    if didCreateTab and keepOpenFlag is not "true" then
      try
        tell application "Microsoft Edge"
          if hadExistingWindow then
            close targetTab
            try
              set restoreIndex to 0
              set currentTabs to tabs of previousWindow
              repeat with candidateIndex from 1 to (count of currentTabs)
                if (id of item candidateIndex of currentTabs) is previousTabID then
                  set restoreIndex to candidateIndex
                  exit repeat
                end if
              end repeat
              if restoreIndex is greater than 0 then
                set active tab index of previousWindow to restoreIndex
              end if
              set index of previousWindow to 1
            end try
          else
            close targetWindow
          end if
        end tell
      end try
    end if
    error errorMessage number errorNumber
  end try
end run
`

function runInEdge(options: CliOptions) {
  const extractor = buildExtractor(options.slug)
  const pollCount = String(Math.ceil(options.timeoutMs / 250))

  return new Promise<string>((resolvePromise, rejectPromise) => {
    execFile(
      '/usr/bin/osascript',
      [
        '-e',
        appleScript,
        options.url,
        extractor,
        String(options.keepOpen),
        pollCount,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        timeout: options.timeoutMs + 10_000,
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || error.message
          rejectPromise(new Error(`Microsoft Edge automation failed: ${details}`))
          return
        }

        resolvePromise(stdout.trim())
      },
    )
  })
}

function validateResult(rawResult: string, expectedSlug: string) {
  let result: ScrapeResult

  try {
    result = JSON.parse(rawResult) as ScrapeResult
  } catch (error) {
    throw new Error(`Edge returned invalid JSON: ${String(error)}`)
  }

  const identifier = result.organization?.properties?.identifier
  if (identifier?.permalink !== expectedSlug) {
    throw new Error(
      `Edge returned the wrong organization payload: ${identifier?.permalink ?? 'missing permalink'}`,
    )
  }

  if (!result.extraction?.authenticated) {
    throw new Error('The result was not captured from a confirmed logged-in Edge session')
  }

  if (Object.keys(result.organization.cards ?? {}).length === 0) {
    throw new Error('Edge returned an incomplete organization payload with no data cards')
  }

  return result
}

function insightsPathFor(rawOutputPath: string) {
  return rawOutputPath.endsWith('.json')
    ? `${rawOutputPath.slice(0, -'.json'.length)}.insights.json`
    : `${rawOutputPath}.insights.json`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(usage())
    return
  }

  const rawResult = await runInEdge(options)
  const result = validateResult(rawResult, options.slug)
  const insights = buildCrunchbaseInsights(result)
  assertInsightsAreClean(insights)
  const insightsOutputPath = insightsPathFor(options.outputPath)

  await mkdir(dirname(options.outputPath), { recursive: true })
  await writeFile(
    options.outputPath,
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  )
  await writeFile(
    insightsOutputPath,
    `${JSON.stringify(insights, null, 2)}\n`,
    'utf8',
  )

  const identifier = result.organization.properties?.identifier
  const cardCount = Object.keys(result.organization.cards ?? {}).length

  console.log(`Saved ${identifier?.value ?? options.slug}`)
  console.log(`Output: ${options.outputPath}`)
  console.log(`Insights: ${insightsOutputPath}`)
  console.log(`UUID: ${identifier?.uuid ?? 'not provided'}`)
  console.log(`Cards: ${cardCount}`)
  console.log(
    `Authenticated Edge session: ${result.extraction.authenticated ? 'yes' : 'not confirmed'}`,
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
