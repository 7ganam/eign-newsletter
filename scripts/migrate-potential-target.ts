import assert from 'node:assert/strict'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { UnifiedPeopleFile } from '../src/unifiedPeopleTypes'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const PEOPLE_PATH = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const APPLY = process.argv.includes('--apply')

const original = JSON.parse(await readFile(PEOPLE_PATH, 'utf8')) as UnifiedPeopleFile
const migrated = structuredClone(original)
let initialized = 0
let copiedTargets = 0

for (const person of migrated.people) {
  const influence = person.influence as UnifiedPeopleFile['people'][number]['influence'] & {
    potential_target?: boolean
  }
  const currentTarget = influence.target === true
  if (typeof influence.potential_target !== 'boolean') {
    influence.potential_target = currentTarget
    initialized += 1
    if (currentTarget) copiedTargets += 1
  }
  influence.target = false
}

migrated.generated_at = new Date().toISOString()
const potentialTargets = migrated.people.filter((person) => person.influence.potential_target).length
const activeTargets = migrated.people.filter((person) => person.influence.target).length

assert.equal(
  migrated.people.filter((person) => typeof person.influence.potential_target === 'boolean').length,
  migrated.people.length,
  'Every person must have an explicit potential_target value.',
)
assert.equal(activeTargets, 0, 'Every active Target must be cleared.')

if (APPLY) {
  const temporaryPath = `${PEOPLE_PATH}.${process.pid}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, PEOPLE_PATH)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

console.log(JSON.stringify({
  applied: APPLY,
  people: migrated.people.length,
  initialized,
  copiedTargets,
  potentialTargets,
  activeTargets,
}, null, 2))
