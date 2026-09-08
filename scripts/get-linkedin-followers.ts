import { execFile } from 'node:child_process'
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { LinkedInFollowerResult } from './lib/linkedin-followers'
import {
  buildLinkedInFollowerExtractor,
  LINKEDIN_ERROR_PREFIX,
  LINKEDIN_WAIT_PREFIX,
  parseLinkedInProfileUrl,
  validateLinkedInFollowerResult,
} from './lib/linkedin-followers'

export type BrowserChoice = 'brave' | 'chrome' | 'edge'

export type FetchLinkedInFollowersOptions = {
  browser?: BrowserChoice
  keepOpen?: boolean
  timeoutMs?: number
}

type CliOptions = {
  browser: BrowserChoice
  help: boolean
  keepOpen: boolean
  outputPath?: string
  timeoutMs: number
  url?: string
}

const BROWSER_APPS: Record<BrowserChoice, string> = {
  brave: 'Brave Browser',
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
}

function usage() {
  return `Usage:
  pnpm linkedin:followers <linkedin-profile-url> [options]

Options:
      --browser <name>  edge (default), brave, or chrome
  -o, --output <path>   Also save the JSON result to a file
      --keep-open       Leave the LinkedIn tab open after extraction
      --timeout <ms>    Wait timeout (default: 30000)
  -h, --help            Show this help

Examples:
  pnpm linkedin:followers https://www.linkedin.com/in/ziad-musallam-99576162/
  pnpm linkedin:followers https://www.linkedin.com/in/wafa-al-obaidat-8a992046/ --browser brave
  pnpm linkedin:followers https://www.linkedin.com/in/example/ -o outputs/linkedin/example.json

The script opens the profile in your existing logged-in browser session and reads
either the follower count in the profile header or the one under Activity. It
does not read or export cookies, passwords, local storage, or browser profiles.

For Chromium browsers, enable View > Developer > Allow JavaScript from Apple
Events once if the browser reports that automation setting is disabled.`
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`)
  return value
}

function parseArgs(args: string[]): CliOptions {
  let browser: BrowserChoice = 'edge'
  let help = false
  let keepOpen = false
  let outputPath: string | undefined
  let timeoutMs = 30_000
  let url: string | undefined

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
    if (argument === '--browser') {
      const value = requireValue(args, index, argument)
      if (!['brave', 'chrome', 'edge'].includes(value)) {
        throw new Error('--browser must be edge, brave, or chrome')
      }
      browser = value as BrowserChoice
      index += 1
      continue
    }
    if (argument === '-o' || argument === '--output') {
      outputPath = resolve(requireValue(args, index, argument))
      index += 1
      continue
    }
    if (argument === '--timeout') {
      timeoutMs = Number(requireValue(args, index, argument))
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000) {
        throw new Error('--timeout must be an integer of at least 1000 milliseconds')
      }
      index += 1
      continue
    }
    if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`)
    if (url) throw new Error(`Unexpected second profile URL: ${argument}`)
    url = argument
  }

  if (!help && !url) throw new Error('A LinkedIn profile URL is required')
  return { browser, help, keepOpen, outputPath, timeoutMs, url }
}

function buildAppleScript(browserApp: string) {
  return String.raw`
on run argv
  set targetURL to item 1 of argv
  set extractionJavascript to item 2 of argv
  set keepOpenFlag to item 3 of argv
  set pollCount to (item 4 of argv) as integer
  set collectorWindowName to "EIGN LinkedIn Collector"
  set targetWindow to missing value
  set targetTab to missing value
  set lastResult to "${LINKEDIN_WAIT_PREFIX}Page has not finished loading"

  try
    using terms from application "Microsoft Edge"
      tell application "${browserApp}"
        if keepOpenFlag is "true" then
          repeat with candidateWindow in every window
            try
              if given name of candidateWindow is collectorWindowName then
                set targetWindow to candidateWindow
                exit repeat
              end if
            end try
          end repeat
        end if

        if targetWindow is missing value then
          set targetWindow to make new window with properties {visible:false}
          if keepOpenFlag is "true" then
            set given name of targetWindow to collectorWindowName
          end if
        end if

        -- Reassert this throughout every request. Edge can surface a hidden
        -- window after navigation finishes unless it is also kept minimized.
        if keepOpenFlag is "true" then
          set minimized of targetWindow to true
        end if
        set visible of targetWindow to false
        set targetTab to active tab of targetWindow
        set URL of targetTab to targetURL
        if keepOpenFlag is "true" then
          set minimized of targetWindow to true
        end if
        set visible of targetWindow to false

        repeat pollCount times
          if keepOpenFlag is "true" then
            set minimized of targetWindow to true
            set visible of targetWindow to false
          end if
          if (loading of targetTab) is false then
            try
              set lastResult to execute targetTab javascript extractionJavascript
            on error scriptError
              if scriptError contains "JavaScript from Apple Events" or scriptError contains "AppleScript is turned off" then
                set lastResult to "${LINKEDIN_ERROR_PREFIX}" & scriptError
              else
                set lastResult to "${LINKEDIN_WAIT_PREFIX}" & scriptError
              end if
            end try

            if lastResult starts with "${LINKEDIN_ERROR_PREFIX}" then
              error lastResult
            end if

            if lastResult does not start with "${LINKEDIN_WAIT_PREFIX}" then
              if keepOpenFlag is not "true" then
                close targetWindow
                set targetWindow to missing value
              else
                set minimized of targetWindow to true
                set visible of targetWindow to false
              end if
              return lastResult
            end if
          end if
          delay 0.25
        end repeat

        error "Timed out waiting for LinkedIn followers. Last result: " & lastResult
      end tell
    end using terms from
  on error errorMessage number errorNumber
    if targetWindow is not missing value then
      try
        using terms from application "Microsoft Edge"
          tell application "${browserApp}"
            if keepOpenFlag is "true" then
              set minimized of targetWindow to true
              set visible of targetWindow to false
            else
              close targetWindow
            end if
          end tell
        end using terms from
      end try
    end if
    error errorMessage number errorNumber
  end try
end run
`
}

function runInBrowser(options: CliOptions, extractor: string) {
  const browserApp = BROWSER_APPS[options.browser]
  const pollCount = String(Math.ceil(options.timeoutMs / 250))

  return new Promise<string>((resolvePromise, rejectPromise) => {
    execFile(
      '/usr/bin/osascript',
      [
        '-e',
        buildAppleScript(browserApp),
        options.url!,
        extractor,
        String(options.keepOpen),
        pollCount,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: options.timeoutMs + 10_000,
      },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || error.message
          const settingHint = /JavaScript from Apple Events|AppleScript is turned off/i.test(details)
            ? ' Enable View > Developer > Allow JavaScript from Apple Events in the selected browser.'
            : ''
          rejectPromise(new Error(`${browserApp} automation failed: ${details}.${settingHint}`))
          return
        }
        resolvePromise(stdout.trim())
      },
    )
  })
}

export async function fetchLinkedInFollowers(
  url: string,
  options: FetchLinkedInFollowersOptions = {},
): Promise<LinkedInFollowerResult> {
  const browser = options.browser ?? 'edge'
  const keepOpen = options.keepOpen ?? false
  const timeoutMs = options.timeoutMs ?? 30_000
  const target = parseLinkedInProfileUrl(url)
  const browserApp = BROWSER_APPS[browser]
  const extractor = buildLinkedInFollowerExtractor(target, browserApp)
  const rawResult = await runInBrowser({
    browser,
    help: false,
    keepOpen,
    timeoutMs,
    url,
  }, extractor)
  return validateLinkedInFollowerResult(rawResult, target)
}

async function writeJsonAtomically(path: string, value: unknown) {
  const temporaryPath = `${path}.${process.pid}.tmp`
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const result = await fetchLinkedInFollowers(options.url!, options)
  if (options.outputPath) await writeJsonAtomically(options.outputPath, result)
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main()
}
