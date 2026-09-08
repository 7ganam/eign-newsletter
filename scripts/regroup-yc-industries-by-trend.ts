import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

type IndustryGroup = {
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

export {}

const projectRoot = resolve(import.meta.dirname, '..')
const chartFile = resolve(projectRoot, 'assets/posts/yc-industry-funding-flourish-all-time-smoothed.tsv')
const groupFile = resolve(projectRoot, 'assets/posts/yc-industry-groups.json')

const trendTitles = [
  'SaaS & Enterprise Software',
  'FinTech',
  'AI & Machine Learning',
  'Hardware, IoT & Semiconductors',
  'Transportation, Mobility, Logistics & Delivery',
  'E-Commerce, Marketplaces & Retail',
  'Gaming & Interactive Entertainment',
  'Productivity & Collaboration Tools',
  'Social, Community & Communication',
  'Developer Tools, Cloud & Infrastructure',
  'Data & Analytics',
  'Cybersecurity & Privacy',
  'Consumer Apps & Services',
  'Media, Content & Creator Tools',
  'Robotics, Drones & Automation',
  'Blockchain, Crypto & Web3',
  'AR/VR & Spatial Computing',
  'Biotech & Life Sciences',
  'Climate, Energy & Sustainability',
  'Space & Aerospace',
  'Education Technology',
  'Real Estate & Construction Technology',
  'Food & Agriculture Technology',
  'Travel, Hospitality & Events',
  'Government, Defense & Civic Technology',
] as const

type TrendTitle = typeof trendTitles[number]

const sourceGroupToTrend: Record<string, TrendTitle> = {
  'AR, VR & Metaverse': 'AR/VR & Spatial Computing',
  'Accessibility & Assistive Technology': 'Consumer Apps & Services',
  'Advertising': 'Media, Content & Creator Tools',
  'Agriculture & AgTech': 'Food & Agriculture Technology',
  'AI & Machine Learning': 'AI & Machine Learning',
  'Audio & Music': 'Media, Content & Creator Tools',
  'Automotive & Mobility': 'Transportation, Mobility, Logistics & Delivery',
  'Beauty & Cosmetics': 'Consumer Apps & Services',
  'Betting & Prediction Markets': 'Gaming & Interactive Entertainment',
  'Biotechnology & Pharmaceuticals': 'Biotech & Life Sciences',
  'Blockchain & Crypto': 'Blockchain, Crypto & Web3',
  'Business Automation': 'Robotics, Drones & Automation',
  'Business Services': 'SaaS & Enterprise Software',
  'Climate & Environment': 'Climate, Energy & Sustainability',
  'Cloud Infrastructure': 'Developer Tools, Cloud & Infrastructure',
  'Commercial': 'SaaS & Enterprise Software',
  'Construction & Built Environment': 'Real Estate & Construction Technology',
  'Credit & Lending': 'FinTech',
  'Customer Support': 'SaaS & Enterprise Software',
  'Data & Analytics': 'Data & Analytics',
  'Deathcare': 'Consumer Apps & Services',
  'Defense & Public Safety': 'Government, Defense & Civic Technology',
  'Design & Creative': 'Media, Content & Creator Tools',
  'Developer Tools': 'Developer Tools, Cloud & Infrastructure',
  'E-Commerce & Marketplaces': 'E-Commerce, Marketplaces & Retail',
  'Education & Training': 'Education Technology',
  'Energy': 'Climate, Energy & Sustainability',
  'Events & Ticketing': 'Travel, Hospitality & Events',
  'Family & Childcare': 'Consumer Apps & Services',
  'Fashion & Apparel': 'E-Commerce, Marketplaces & Retail',
  'Financial Services & FinTech': 'FinTech',
  'Food & Beverage': 'Food & Agriculture Technology',
  'Gaming & eSports': 'Gaming & Interactive Entertainment',
  'Geospatial & Location Intelligence': 'Data & Analytics',
  'Governance, Risk & Compliance': 'SaaS & Enterprise Software',
  'Government & Civic Tech': 'Government, Defense & Civic Technology',
  'HR & Recruiting': 'SaaS & Enterprise Software',
  'Healthcare': 'Biotech & Life Sciences',
  'Home & Household': 'Consumer Apps & Services',
  'Industrial & Manufacturing': 'Hardware, IoT & Semiconductors',
  'Insurance': 'FinTech',
  'Investing & Capital Markets': 'FinTech',
  'Legal': 'SaaS & Enterprise Software',
  'Lifestyle & Wellness': 'Consumer Apps & Services',
  'Logistics & Supply Chain': 'Transportation, Mobility, Logistics & Delivery',
  'Maritime': 'Transportation, Mobility, Logistics & Delivery',
  'Market & Product Research': 'Data & Analytics',
  'Marketing': 'SaaS & Enterprise Software',
  'Media & Video': 'Media, Content & Creator Tools',
  'Mining & Natural Resources': 'Climate, Energy & Sustainability',
  'Mobile Platforms': 'Developer Tools, Cloud & Infrastructure',
  'Nonprofit & Social Impact': 'Consumer Apps & Services',
  'Operating Systems & Browsers': 'Developer Tools, Cloud & Infrastructure',
  'Payments': 'FinTech',
  'Pet & Veterinary': 'Consumer Apps & Services',
  'Productivity & Collaboration': 'Productivity & Collaboration Tools',
  'Publishing & News': 'Media, Content & Creator Tools',
  'Real Estate & PropTech': 'Real Estate & Construction Technology',
  'Rental & Sharing Services': 'E-Commerce, Marketplaces & Retail',
  'Retail': 'E-Commerce, Marketplaces & Retail',
  'Robotics & Drones': 'Robotics, Drones & Automation',
  'Sales & CRM': 'SaaS & Enterprise Software',
  'Search & Discovery': 'Data & Analytics',
  'Security & Privacy': 'Cybersecurity & Privacy',
  'Small & Local Business': 'SaaS & Enterprise Software',
  'Social & Community': 'Social, Community & Communication',
  'Space & Aerospace': 'Space & Aerospace',
  'Sports & Recreation': 'Consumer Apps & Services',
  'Startup Ecosystem': 'Consumer Apps & Services',
  'Telecom & Communications': 'Social, Community & Communication',
  'Travel & Hospitality': 'Travel, Hospitality & Events',
  'Wellness & Fitness': 'Consumer Apps & Services',
  'hardware': 'Hardware, IoT & Semiconductors',
  'saas': 'SaaS & Enterprise Software',
}

const labelOverrides: Record<string, TrendTitle> = {
  'A/B Testing': 'Data & Analytics',
  'Air Transportation': 'Transportation, Mobility, Logistics & Delivery',
  'Audiobooks': 'Media, Content & Creator Tools',
  'Biometrics': 'Cybersecurity & Privacy',
  'Bookkeeping and Payroll': 'FinTech',
  'Career Planning': 'Consumer Apps & Services',
  'Chatbot': 'AI & Machine Learning',
  'CMS': 'Media, Content & Creator Tools',
  'Communication Hardware': 'Hardware, IoT & Semiconductors',
  'Communications Infrastructure': 'Developer Tools, Cloud & Infrastructure',
  'Consumer Applications': 'Consumer Apps & Services',
  'Consumer Reviews': 'E-Commerce, Marketplaces & Retail',
  'Consumer Software': 'Consumer Apps & Services',
  'Digital Signage': 'Hardware, IoT & Semiconductors',
  'Electronic Health Record (EHR)': 'SaaS & Enterprise Software',
  'E-Signature': 'Productivity & Collaboration Tools',
  'Emerging Markets': 'Consumer Apps & Services',
  'Food Delivery': 'Transportation, Mobility, Logistics & Delivery',
  'Gift Card': 'FinTech',
  'Grocery': 'E-Commerce, Marketplaces & Retail',
  'Health Care': 'Consumer Apps & Services',
  'Home Health Care': 'Consumer Apps & Services',
  'Hospital': 'Consumer Apps & Services',
  'Information and Communications Technology (ICT)': 'Developer Tools, Cloud & Infrastructure',
  'Medical Device': 'Hardware, IoT & Semiconductors',
  'Mental Health': 'Consumer Apps & Services',
  'mHealth': 'Consumer Apps & Services',
  'Mobile Devices': 'Hardware, IoT & Semiconductors',
  'Nursing and Residential Care': 'Consumer Apps & Services',
  'Outpatient Care': 'Consumer Apps & Services',
  'Personal Health': 'Consumer Apps & Services',
  'Point of Sale': 'FinTech',
  'Psychology': 'Consumer Apps & Services',
  'Real Estate Investment': 'FinTech',
  'Rehabilitation': 'Consumer Apps & Services',
  'Sex Tech': 'Consumer Apps & Services',
  'Smart Home': 'Hardware, IoT & Semiconductors',
  'Tax Preparation': 'FinTech',
  'Telehealth': 'SaaS & Enterprise Software',
  'Transportation': 'Transportation, Mobility, Logistics & Delivery',
  'Virtual Assistant': 'AI & Machine Learning',
  'Virtual Desktop': 'Developer Tools, Cloud & Infrastructure',
  'Virtualization': 'Developer Tools, Cloud & Infrastructure',
}

const parseGroupFile = async () => {
  const parsed = JSON.parse(await readFile(groupFile, 'utf8')) as Partial<IndustryGroupFile>
  if (!Array.isArray(parsed.groups)) throw new Error('The current grouping overlay has no groups array.')
  return parsed as IndustryGroupFile
}

const readChartLabels = async () => [...new Set(
  (await readFile(chartFile, 'utf8'))
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split('\t', 1)[0]?.trim() ?? '')
    .filter(Boolean),
)].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const current = await parseGroupFile()
const chartLabels = await readChartLabels()
const allowedLabels = new Set(chartLabels)
const sourceByLabel = new Map<string, string>()

for (const group of current.groups) {
  const target = trendTitles.includes(group.name as TrendTitle)
    ? group.name as TrendTitle
    : sourceGroupToTrend[group.name]
  if (!target) throw new Error(`No trend mapping exists for the current group “${group.name}”.`)

  for (const label of group.labels) {
    if (!allowedLabels.has(label)) throw new Error(`The current overlay contains unknown label “${label}”.`)
    if (sourceByLabel.has(label)) throw new Error(`The current overlay assigns “${label}” more than once.`)
    sourceByLabel.set(label, group.name)
  }
}

const missingLabels = chartLabels.filter((label) => !sourceByLabel.has(label))
if (missingLabels.length) {
  throw new Error(`Refusing to regroup: ${missingLabels.length} labels are currently unassigned: ${missingLabels.join(', ')}`)
}

const unknownOverrides = Object.keys(labelOverrides).filter((label) => !allowedLabels.has(label))
if (unknownOverrides.length) {
  throw new Error(`The override plan contains unknown labels: ${unknownOverrides.join(', ')}`)
}

const targetForLabel = (label: string): TrendTitle => {
  const override = labelOverrides[label]
  if (override) return override
  const sourceName = sourceByLabel.get(label)
  if (!sourceName) throw new Error(`No source group exists for “${label}”.`)
  if (trendTitles.includes(sourceName as TrendTitle)) return sourceName as TrendTitle
  const target = sourceGroupToTrend[sourceName]
  if (!target) throw new Error(`No trend mapping exists for “${sourceName}”.`)
  return target
}

const now = new Date().toISOString()
const nextGroups: IndustryGroup[] = trendTitles.map((name) => {
  const existing = current.groups.find((group) => group.name === name)
  return {
    createdAt: existing?.createdAt || now,
    id: existing?.id || `trend-${slugify(name)}`,
    labels: chartLabels.filter((label) => targetForLabel(label) === name),
    name,
    updatedAt: now,
  }
})

const emptyGroups = nextGroups.filter((group) => group.labels.length === 0)
if (emptyGroups.length) throw new Error(`The plan creates empty trend groups: ${emptyGroups.map((group) => group.name).join(', ')}`)

const assignedLabels = nextGroups.flatMap((group) => group.labels)
if (assignedLabels.length !== chartLabels.length || new Set(assignedLabels).size !== chartLabels.length) {
  throw new Error('The trend plan does not assign every chart label exactly once.')
}

console.log(`Validated ${chartLabels.length} labels into exactly ${nextGroups.length} trend groups.`)
for (const group of nextGroups) console.log(`${String(group.labels.length).padStart(3)}  ${group.name}`)

if (process.argv.includes('--dry-run')) process.exit(0)

const nextFile: IndustryGroupFile = { groups: nextGroups, updatedAt: now, version: 1 }
await mkdir(dirname(groupFile), { recursive: true })
const temporaryFile = `${groupFile}.${process.pid}.tmp`
try {
  await writeFile(temporaryFile, `${JSON.stringify(nextFile, null, 2)}\n`, 'utf8')
  await rename(temporaryFile, groupFile)
} catch (error) {
  await unlink(temporaryFile).catch(() => undefined)
  throw error
}

console.log('Saved the 25-group trend overlay. Original Crunchbase and chart source files were not modified.')
