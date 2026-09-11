import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type PulledCrunchbaseCompany = {
  crunchbaseUrl: string
  headquarters: string
  industries: string
  name: string
  shortDescription: string
  totalRaisedUsd: string
  website: string
}

type PulledCrunchbaseSnapshot = {
  createdAt?: string
  items?: PulledCrunchbaseCompany[]
  updatedAt?: string
}

export type IndustryGroup = {
  createdAt: string
  id: string
  labels: string[]
  name: string
  updatedAt: string
}

type IndustryGroupFile = {
  groups: IndustryGroup[]
  updatedAt: string
  version: number
}

export type IndustryTaxonomyPaths = {
  chartFile: string
  groupFile: string
  snapshotFile: string
}

const EMPTY_GROUP_FILE: IndustryGroupFile = { groups: [], updatedAt: '', version: 1 }

const normalizeName = (value: unknown) => {
  if (typeof value !== 'string') throw new Error('Enter a group name.')
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('Enter a group name.')
  if (name.length > 80) throw new Error('Group names must be 80 characters or fewer.')
  return name
}

const readChartLabels = async (chartFile: string) => {
  const input = await readFile(chartFile, 'utf8')
  const labels = input
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split('\t', 1)[0]?.trim() ?? '')
    .filter(Boolean)
  return [...new Set(labels)].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
}

const readGroupFile = async (groupFile: string): Promise<IndustryGroupFile> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(groupFile, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_GROUP_FILE
    const file = parsed as Partial<IndustryGroupFile>
    if (!Array.isArray(file.groups)) return EMPTY_GROUP_FILE
    return {
      groups: file.groups.flatMap((candidate) => {
        if (!candidate || typeof candidate !== 'object') return []
        const group = candidate as Partial<IndustryGroup>
        if (typeof group.id !== 'string' || typeof group.name !== 'string' || !Array.isArray(group.labels)) return []
        return [{
          createdAt: typeof group.createdAt === 'string' ? group.createdAt : '',
          id: group.id,
          labels: group.labels.filter((label): label is string => typeof label === 'string'),
          name: group.name,
          updatedAt: typeof group.updatedAt === 'string' ? group.updatedAt : '',
        }]
      }),
      updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : '',
      version: typeof file.version === 'number' ? file.version : 1,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY_GROUP_FILE
    throw error
  }
}

const saveGroupFile = async (groupFile: string, groups: IndustryGroup[]) => {
  const file: IndustryGroupFile = {
    groups,
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  await mkdir(dirname(groupFile), { recursive: true })
  const temporaryFile = `${groupFile}.${process.pid}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, groupFile)
  } catch (error) {
    await unlink(temporaryFile).catch(() => undefined)
    throw error
  }
  return file
}

const normalizeGroups = (groups: IndustryGroup[], allowedLabels: Set<string>) => {
  const assigned = new Set<string>()
  return groups.map((group) => ({
    ...group,
    labels: [...new Set(group.labels)]
      .filter((label) => allowedLabels.has(label) && !assigned.has(label))
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
      .filter((label) => {
        assigned.add(label)
        return true
      }),
  }))
}

let writeQueue = Promise.resolve()

const queueWrite = <T>(operation: () => Promise<T>) => {
  const result = writeQueue.then(operation)
  writeQueue = result.then(() => undefined, () => undefined)
  return result
}

export const loadIndustryTaxonomy = async (paths: IndustryTaxonomyPaths) => {
  const [labels, groupFile, rawSnapshot] = await Promise.all([
    readChartLabels(paths.chartFile),
    readGroupFile(paths.groupFile),
    readFile(paths.snapshotFile, 'utf8'),
  ])
  const parsed: unknown = JSON.parse(rawSnapshot)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The YC Crunchbase snapshot is not an object.')
  }
  const snapshot = parsed as PulledCrunchbaseSnapshot
  if (!Array.isArray(snapshot.items)) throw new Error('The YC Crunchbase snapshot has no items array.')

  const allowedLabels = new Set(labels)
  const companiesByLabel = new Map<string, PulledCrunchbaseCompany[]>()
  labels.forEach((label) => companiesByLabel.set(label, []))
  snapshot.items.forEach((company) => {
    company.industries
      .split(' · ')
      .map((label) => label.trim())
      .filter((label) => allowedLabels.has(label))
      .forEach((label) => companiesByLabel.get(label)?.push(company))
  })

  const industries = labels.map((name) => {
    const companies = companiesByLabel.get(name) ?? []
    const ranked = [...companies].sort((left, right) => {
      const amount = (Number(right.totalRaisedUsd) || 0) - (Number(left.totalRaisedUsd) || 0)
      return amount || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
    return {
      companyCount: companies.length,
      name,
      sampleCompanies: ranked.slice(0, 8).map((company) => ({
        crunchbaseUrl: company.crunchbaseUrl,
        headquarters: company.headquarters,
        industries: company.industries.split(' · ').filter(Boolean),
        name: company.name,
        shortDescription: company.shortDescription,
        totalRaisedUsd: Number(company.totalRaisedUsd) || 0,
        website: company.website,
      })),
    }
  })
  const groups = normalizeGroups(groupFile.groups, allowedLabels)
  const assignedLabels = new Set(groups.flatMap((group) => group.labels))

  return {
    groups,
    industries,
    source: {
      chartFile: 'assets/posts/yc-industry-funding-flourish-all-time-smoothed.tsv',
      companyFile: 'data/companies/crunchbase-yc-company-profiles.json',
      groupsFile: 'assets/posts/yc-industry-groups.json',
      provider: 'Crunchbase',
      updatedAt: snapshot.updatedAt || snapshot.createdAt || '',
    },
    summary: {
      assigned: assignedLabels.size,
      companies: snapshot.items.length,
      groups: groups.length,
      industries: industries.length,
      unassigned: industries.length - assignedLabels.size,
    },
  }
}

export const createIndustryGroup = (paths: IndustryTaxonomyPaths, value: unknown) => queueWrite(async () => {
  const name = normalizeName(value)
  const [labels, file] = await Promise.all([readChartLabels(paths.chartFile), readGroupFile(paths.groupFile)])
  const groups = normalizeGroups(file.groups, new Set(labels))
  if (groups.some((group) => group.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0)) {
    throw new Error('A group with that name already exists.')
  }
  const now = new Date().toISOString()
  const group: IndustryGroup = { createdAt: now, id: randomUUID(), labels: [], name, updatedAt: now }
  const saved = await saveGroupFile(paths.groupFile, [...groups, group])
  return { group, groups: saved.groups, updatedAt: saved.updatedAt }
})

export const updateIndustryGroup = (
  paths: IndustryTaxonomyPaths,
  groupId: string,
  body: { labels?: unknown; name?: unknown },
) => queueWrite(async () => {
  const [labels, file] = await Promise.all([readChartLabels(paths.chartFile), readGroupFile(paths.groupFile)])
  const allowedLabels = new Set(labels)
  const groups = normalizeGroups(file.groups, allowedLabels)
  const current = groups.find((group) => group.id === groupId)
  if (!current) return null
  const nextName = Object.prototype.hasOwnProperty.call(body, 'name') ? normalizeName(body.name) : current.name
  if (groups.some((group) => group.id !== groupId && group.name.localeCompare(nextName, undefined, { sensitivity: 'base' }) === 0)) {
    throw new Error('A group with that name already exists.')
  }
  let nextLabels = current.labels
  if (Object.prototype.hasOwnProperty.call(body, 'labels')) {
    if (!Array.isArray(body.labels) || !body.labels.every((label) => typeof label === 'string')) {
      throw new Error('Group labels must be an array of industry names.')
    }
    nextLabels = [...new Set(body.labels)]
    const unknown = nextLabels.find((label) => !allowedLabels.has(label))
    if (unknown) throw new Error(`“${unknown}” is not in the current charting dataset.`)
  }
  const now = new Date().toISOString()
  const updatedGroups = groups.map((group) => {
    if (group.id === groupId) return { ...group, labels: nextLabels, name: nextName, updatedAt: now }
    if (!Object.prototype.hasOwnProperty.call(body, 'labels')) return group
    return { ...group, labels: group.labels.filter((label) => !nextLabels.includes(label)) }
  })
  const saved = await saveGroupFile(paths.groupFile, normalizeGroups(updatedGroups, allowedLabels))
  return { group: saved.groups.find((group) => group.id === groupId), groups: saved.groups, updatedAt: saved.updatedAt }
})
