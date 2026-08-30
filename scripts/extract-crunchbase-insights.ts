import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertInsightsAreClean,
  buildCrunchbaseInsights,
} from './lib/crunchbase-insights'

const DEFAULT_INPUT = 'outputs/crunchbase/axiom-biosciences.json'

function usage() {
  return `Usage:
  pnpm extract:crunchbase-insights [raw-json] [options]

Options:
  -o, --output <path>   Insights JSON output path
  -h, --help            Show this help

Examples:
  pnpm extract:crunchbase-insights
  pnpm extract:crunchbase-insights outputs/crunchbase/stripe.json
  pnpm extract:crunchbase-insights outputs/crunchbase/stripe.json -o outputs/crunchbase/stripe.insights.json`
}

function defaultOutputPath(inputPath: string) {
  return inputPath.endsWith('.json')
    ? `${inputPath.slice(0, -'.json'.length)}.insights.json`
    : `${inputPath}.insights.json`
}

function parseArgs(args: string[]) {
  let inputPath = DEFAULT_INPUT
  let outputPath: string | undefined
  let hasInput = false
  let help = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--') {
      continue
    }

    if (argument === '-h' || argument === '--help') {
      help = true
      continue
    }

    if (argument === '-o' || argument === '--output') {
      const value = args[index + 1]
      if (!value || value.startsWith('-')) {
        throw new Error(`${argument} requires a path`)
      }
      outputPath = value
      index += 1
      continue
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    }

    if (hasInput) {
      throw new Error(`Unexpected argument: ${argument}`)
    }
    inputPath = argument
    hasInput = true
  }

  const resolvedInput = resolve(inputPath)
  return {
    help,
    inputPath: resolvedInput,
    outputPath: resolve(outputPath ?? defaultOutputPath(resolvedInput)),
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const raw = JSON.parse(await readFile(options.inputPath, 'utf8')) as unknown
  const insights = buildCrunchbaseInsights(raw)
  assertInsightsAreClean(insights)
  await writeFile(options.outputPath, `${JSON.stringify(insights, null, 2)}\n`, 'utf8')

  const facts = insights.facts as Record<string, unknown>
  const company = facts.company as Record<string, unknown>
  const insightItems = insights.insights as unknown[]
  console.log(`Extracted insights for ${String(company.name)}`)
  console.log(`Output: ${options.outputPath}`)
  console.log(`Insights: ${insightItems.length}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
