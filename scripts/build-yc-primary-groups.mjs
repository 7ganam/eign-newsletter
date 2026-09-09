import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const { groups } = await read('assets/posts/yc-industry-groups.json')
const manifest = await read('outputs/crunchbase/manifest.json')
const companies = await Promise.all(manifest.entries.filter((entry) => entry.status === 'success').map(async (entry) => {
  const insight = await read(`outputs/crunchbase/${entry.insightsPath.split('/').at(-1)}`)
  return { ...insight.facts.company, crunchbaseUrl: entry.requestedUrl, industries: (insight.facts.company.industries ?? []).join(' · ') }
}))

// Product/customer evidence takes precedence over enabling technologies such as AI.
// Only existing label groups are eligible: this preserves each logo's group attribution.
const signals = [
  ['FinTech', /\b(payment|banking|lending|loan|credit card|insurance|payroll|accounting|financial|investment|trading|wealth|tax)\w*\b/gi],
  ['AI & Machine Learning', /\b(language model|foundation model|generative ai|machine learning|artificial intelligence|ai model|model training|data label)\w*\b/gi],
  ['SaaS & Enterprise Software', /\b(recruit|legal|law firm|lawyer|human resources|sales team|customer support|marketing|crm|enterprise software|compliance|hiring)\w*\b/gi],
  ['Hardware, IoT & Semiconductors', /\b(semiconductor|chip|quantum|hardware|sensor|electronics|medical device|manufactur|material)\w*\b/gi],
  ['Transportation, Mobility, Logistics & Delivery', /\b(freight|logistics|shipping|delivery|transport|vehicle|automotive|fleet|supply chain|autonomous driving)\w*\b/gi],
  ['E-Commerce, Marketplaces & Retail', /\b(e-commerce|ecommerce|retail|shopping|wholesale|marketplace|grocery|fashion)\w*\b/gi],
  ['Gaming & Interactive Entertainment', /\b(gaming|video game|game developer|esports|gambling|prediction market)\w*\b/gi],
  ['Productivity & Collaboration Tools', /\b(productivity|collaborat|document|file shar|task management|project management|meeting|workspace)\w*\b/gi],
  ['Social, Community & Communication', /\b(social network|social media|community|communities|messaging|telecom|communication|video chat)\w*\b/gi],
  ['Developer Tools, Cloud & Infrastructure', /\b(developer|devops|cloud infrastructure|cloud computing|api|open.source|application deployment|software testing)\w*\b/gi],
  ['Data & Analytics', /\b(analytics|data integration|database|data warehouse|business intelligence|data pipeline|data management|search engine)\w*\b/gi],
  ['Cybersecurity & Privacy', /\b(cyber|security|threat|fraud|identity|privacy|authentication)\w*\b/gi],
  ['Consumer Apps & Services', /\b(healthcare|health care|patient|mental health|wellness|fitness|consumer|home service|pet care)\w*\b/gi],
  ['Media, Content & Creator Tools', /\b(content creat|creator|video|audio|music|advertis|publishing|media|design|podcast)\w*\b/gi],
  ['Robotics, Drones & Automation', /\b(robot|drone|industrial automation|robotic process)\w*\b/gi],
  ['Blockchain, Crypto & Web3', /\b(crypto|blockchain|bitcoin|ethereum|web3|decentralized finance|smart contract)\w*\b/gi],
  ['AR/VR & Spatial Computing', /\b(augmented reality|virtual reality|spatial computing|metaverse)\w*\b/gi],
  ['Biotech & Life Sciences', /\b(biotech|drug|therapeutic|genetic|diagnostic|clinical|molecular|pharmaceutical|biolog|cancer|protein)\w*\b/gi],
  ['Climate, Energy & Sustainability', /\b(energy|solar|battery|carbon|climate|renewable|nuclear|fusion|sustainab|waste|water purification)\w*\b/gi],
  ['Space & Aerospace', /\b(space|satellite|rocket|aerospace|orbital|launch vehicle)\w*\b/gi],
  ['Education Technology', /\b(education|learning|student|school|tutor|teaching|training course)\w*\b/gi],
  ['Real Estate & Construction Technology', /\b(real estate|construction|property|building maintenance|mortgage|landlord|rental propert)\w*\b/gi],
  ['Food & Agriculture Technology', /\b(agricultur|farm|food|restaurant|crop|plant.based|alternative protein)\w*\b/gi],
  ['Travel, Hospitality & Events', /\b(travel|hospitality|hotel|vacation|tourism|event|ticket|accommodation)\w*\b/gi],
  ['Government, Defense & Civic Technology', /\b(defense|military|government|public safety|law enforcement|civic)\w*\b/gi],
]
const genericGroups = new Set(['AI & Machine Learning', 'SaaS & Enterprise Software', 'Data & Analytics', 'Developer Tools, Cloud & Infrastructure'])
const broadLabels = new Set(['Artificial Intelligence (AI)', 'Machine Learning', 'SaaS', 'Enterprise Software', 'Analytics', 'Information Services', 'Marketplace', 'Manufacturing', 'Hardware', 'Medical', 'Health Care'])

// Reviewed product-led decisions, keyed by identity rather than display name.
const overrides = {
  'stripe': ['FinTech', 'Payment processing is the core product.'],
  'coinbase': ['Blockchain, Crypto & Web3', 'Cryptocurrency exchange and custody.'],
  'kalshi': ['Gaming & Interactive Entertainment', 'Prediction-market exchange; Prediction Markets belongs to this existing taxonomy group.'],
  'rippling': ['SaaS & Enterprise Software', 'Workforce and HR platform; payroll is one part of the suite.'],
  'deel': ['SaaS & Enterprise Software', 'Global hiring and workforce management platform.'],
  'gusto': ['FinTech', 'Payroll and employee financial administration.'],
  'dropbox': ['Productivity & Collaboration Tools', 'File sharing and collaboration for teams.'],
  'supabase': ['Developer Tools, Cloud & Infrastructure', 'Backend platform for application developers.'],
  'replit': ['Developer Tools, Cloud & Infrastructure', 'Application development and deployment environment.'],
  'scale-2': ['AI & Machine Learning', 'Training-data and model infrastructure for AI.'],
  'airbnb': ['Travel, Hospitality & Events', 'Travel accommodation marketplace.'],
  'equipmentshare-com': ['Real Estate & Construction Technology', 'Construction equipment rental and management.'],
  'doordash': ['Transportation, Mobility, Logistics & Delivery', 'On-demand delivery service.'],
  'instacart': ['E-Commerce, Marketplaces & Retail', 'Online grocery shopping marketplace.'],
  'indigo-fair': ['E-Commerce, Marketplaces & Retail', 'Wholesale marketplace for retailers.'],
  'brex': ['FinTech', 'Corporate cards and expense management.'],
  'flock-safety': ['Government, Defense & Civic Technology', 'Public-safety technology for law enforcement.'],
  'reddit': ['Social, Community & Communication', 'Community discussion platform.'],
  'messagebird': ['Social, Community & Communication', 'Business messaging and communication platform.'],
  'fivetran': ['Data & Analytics', 'Data integration and pipelines.'],
  'optimizely': ['SaaS & Enterprise Software', 'Digital experience and content marketing software for businesses.'],
  'boom-technology': ['Space & Aerospace', 'Designs and manufactures supersonic airplanes; sustainability is a product attribute.'],
  'pagerduty': ['Developer Tools, Cloud & Infrastructure', 'IT operations, infrastructure monitoring, and incident response.'],
  'vanta': ['Cybersecurity & Privacy', 'Security assurance and trust management through automated compliance.'],
  'podium-2': ['SaaS & Enterprise Software', 'Lead generation and management software; AI is an enabling technology.'],
  'matterport': ['AR/VR & Spatial Computing', 'Immersive 3D digital twins of physical spaces.'],
  'argo': ['Data & Analytics', 'Enterprise semantic search product.'],
  'atmo-ai': ['AI & Machine Learning', 'AI weather forecasting platform; government is a customer category.'],
  'automatic-com': ['Transportation, Mobility, Logistics & Delivery', 'Driving assistance and vehicle telemetry.'],
  'backtype': ['SaaS & Enterprise Software', 'Marketing intelligence for brands and agencies.'],
  'board-live': ['FinTech', 'Lending enables cash offers for homebuyers.'],
  'bonfire-interactive': ['Government, Defense & Civic Technology', 'Competitive bidding and public procurement platform.'],
  'boosted-boards': ['Transportation, Mobility, Logistics & Delivery', 'Electric longboards for personal mobility.'],
  'bountii': ['E-Commerce, Marketplaces & Retail', 'Product price comparison for shoppers.'],
  'canvas': ['SaaS & Enterprise Software', 'Business process automation and mobile forms.'],
  'caviar': ['Transportation, Mobility, Logistics & Delivery', 'Restaurant delivery and order tracking.'],
  'clustrix': ['Data & Analytics', 'SQL database; e-commerce merchants are the customers.'],
  'dailybooth': ['Social, Community & Communication', 'Social photoblogging website.'],
  'drchrono': ['SaaS & Enterprise Software', 'Medical-practice management software; EHR is in this taxonomy group.'],
  'fanchatter': ['Social, Community & Communication', 'Fan involvement through shared content.'],
  'feather-2': ['E-Commerce, Marketplaces & Retail', 'Online furniture rental.'],
  'gobble': ['Food & Agriculture Technology', 'Prepared meal kits; delivery is distribution.'],
  'goldbelly': ['E-Commerce, Marketplaces & Retail', 'Marketplace for specialty food makers.'],
  'hykso-2': ['Consumer Apps & Services', 'Connected boxing workouts for consumers.'],
  'iron-ox': ['Food & Agriculture Technology', 'Technology-enabled food growing.'],
  'kite-com': ['Developer Tools, Cloud & Infrastructure', 'Coding assistance for developers.'],
  'machine-zone': ['Gaming & Interactive Entertainment', 'Develops games for social and mobile platforms.'],
  'magic': ['SaaS & Enterprise Software', 'Personal and executive assistant service rather than an AI model product.'],
  'mashgin': ['E-Commerce, Marketplaces & Retail', 'Retail checkout systems powered by computer vision.'],
  'messageparty': ['Media, Content & Creator Tools', 'Mobile blogging and content publishing.'],
  'mixpanel': ['Data & Analytics', 'Product and marketing analytics.'],
  'observe-ai': ['SaaS & Enterprise Software', 'Customer-service automation software.'],
  'omgpop': ['Gaming & Interactive Entertainment', 'Social game developer.'],
  'paperspace': ['Developer Tools, Cloud & Infrastructure', 'GPU computing infrastructure for applications.'],
  'plangrid': ['Real Estate & Construction Technology', 'Construction document and project collaboration.'],
  'poll-everywhere': ['Productivity & Collaboration Tools', 'Audience polling and interactive presentations.'],
  'product-hunt': ['Social, Community & Communication', 'Community for discovering and discussing products.'],
  'protocol-labs': ['Blockchain, Crypto & Web3', 'Distributed network protocol development.'],
  'reducto': ['Developer Tools, Cloud & Infrastructure', 'Document parsing API for application developers.'],
  'rethinkdb': ['Data & Analytics', 'Distributed NoSQL database.'],
  'retool': ['Developer Tools, Cloud & Infrastructure', 'Tools for developing internal applications.'],
  'retrofit': ['Consumer Apps & Services', 'Weight management program for consumers.'],
  'serra': ['Robotics, Drones & Automation', 'Industrial control systems engineering.'],
  'starsky-robotics': ['Transportation, Mobility, Logistics & Delivery', 'Autonomous trucking is the product.'],
  'swiftype': ['Data & Analytics', 'Site and enterprise search.'],
  'teespring': ['E-Commerce, Marketplaces & Retail', 'Creator merchandise commerce.'],
  'unbabel': ['SaaS & Enterprise Software', 'Business translation and multilingual service.'],
  'versive': ['Cybersecurity & Privacy', 'Adversary detection for security.'],
  'voxli': ['Social, Community & Communication', 'Group voice chat; gamers are a customer segment.'],
  'weave': ['SaaS & Enterprise Software', 'Patient communications and practice-management software.'],
  'zapier': ['Robotics, Drones & Automation', 'Automated workflows connecting web applications; this group includes business process automation.'],
  'zestyapp': ['Food & Agriculture Technology', 'Office catering service.'],
  'xobni': ['Productivity & Collaboration Tools', 'Searchable contact profiles and inbox productivity.'],
  'splashup': ['Media, Content & Creator Tools', 'Web-based image editing.'],
  'appjet': ['Developer Tools, Cloud & Infrastructure', 'Online programming and web application development tool.'],
  'scribd': ['Productivity & Collaboration Tools', 'Document sharing and knowledge management at the time of the early funding shown.'],
}

const items = companies.map((company) => {
  const labels = company.industries.split(' · ').filter(Boolean)
  const description = company.shortDescription || ''
  const candidates = groups.flatMap((group) => {
    const matchedLabels = labels.filter((label) => group.labels.includes(label))
    if (!matchedLabels.length) return []
    const pattern = signals.find(([name]) => name === group.name)?.[1]
    const evidence = pattern ? [...new Set((description.match(pattern) || []).map((text) => text.toLowerCase()))] : []
    const labelScore = Math.max(...matchedLabels.map((label) => broadLabels.has(label) ? 1 : 3)) + Math.min(2, (matchedLabels.length - 1) * .5)
    const score = labelScore + Math.min(3, evidence.length) * 3 + (evidence.length && !genericGroups.has(group.name) ? 2 : 0)
    return [{ id: group.id, name: group.name, score, matchedLabels, descriptionEvidence: evidence }]
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  const slug = decodeURIComponent(company.crunchbaseUrl.split('/').at(-1))
  const override = overrides[slug]
  const overrideGroup = override ? groups.find((group) => group.name === override[0]) : null
  if (override && !overrideGroup) throw new Error(`Unknown override group: ${override[0]}`)
  const selected = override
    ? candidates.find((candidate) => candidate.name === override[0]) ?? {
      id: overrideGroup.id,
      name: overrideGroup.name,
      score: null,
      matchedLabels: [],
      descriptionEvidence: [],
    }
    : candidates[0]
  const margin = candidates.length > 1 ? candidates[0].score - candidates[1].score : null
  const reviewStatus = override ? 'reviewed' : !selected ? 'unmapped' : candidates.length === 1 ? 'single-group' : selected.descriptionEvidence.length && margin >= 5 ? 'description-supported' : 'needs-review'
  return {
    crunchbaseUrl: company.crunchbaseUrl, name: company.name,
    primaryGroup: selected?.name ?? null, primaryGroupId: selected?.id ?? null,
    reviewStatus, reason: override?.[1] ?? (!selected ? 'No existing industry label belongs to the current chart taxonomy.' : candidates.length === 1 ? 'All mapped labels belong to one group.' : 'Product/customer terms in the description plus existing industry labels; close or unsupported decisions remain flagged.'),
    description, candidates,
  }
})
if (new Set(items.map((item) => item.crunchbaseUrl)).size !== companies.length) throw new Error('Duplicate company identities')
const summary = Object.fromEntries([...new Set(items.map((item) => item.reviewStatus))].map((status) => [status, items.filter((item) => item.reviewStatus === status).length]))
const output = new URL('assets/crunchbase/yc-company-primary-groups.json', root)
await writeFile(output, JSON.stringify({ version: 1, methodology: 'Fixed logo-display group only. Existing funding attribution is unchanged. Automatic assignments are provisional unless reviewed; unmapped companies require taxonomy review.', summary, items }) + '\n')
console.log(fileURLToPath(output), summary)
