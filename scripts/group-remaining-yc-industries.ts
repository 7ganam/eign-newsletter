type Industry = { name: string }
type Group = { id: string; labels: string[]; name: string }
type Taxonomy = { groups: Group[]; industries: Industry[] }
type GroupMutation = { group?: Group; groups: Group[] }

export {}

const API = 'http://127.0.0.1:18321/api/yc-industry-taxonomy'

const labelsByDestination = new Map<string, string[]>([
  ['Accessibility & Assistive Technology', ['Assistive Technology']],
  ['Advertising', ['Digital Signage']],
  ['Agriculture & AgTech', ['Cannabis', 'Farmers Market']],
  ['AI & Machine Learning', ['Intelligent Systems']],
  ['AR, VR & Metaverse', ['Motion Capture']],
  ['Automotive & Mobility', ['Parking', 'Public Transportation']],
  ['Betting & Prediction Markets', ['Gambling', 'Prediction Markets']],
  ['Business Automation', ['Business Process Automation (BPA)', 'Robotic Process Automation (RPA)']],
  ['Business Services', ['Advice', 'Consulting', 'Management Consulting', 'Outsourcing', 'Professional Services']],
  ['Cloud Infrastructure', ['Content Delivery Network', 'Data Center Automation', 'Infrastructure', 'IT Infrastructure', 'IT Management', 'Real Time']],
  ['Commercial', ['Commercial']],
  ['Construction & Built Environment', ['Heating, Ventilation, and Air Conditioning (HVAC)']],
  ['Data & Analytics', ['Information Services']],
  ['Defense & Public Safety', ['Law Enforcement', 'Military', 'National Security', 'Public Safety']],
  ['Design & Creative', ['Art', 'Creative Agency', 'Human Computer Interaction']],
  ['Developer Tools', ['Simulation']],
  ['E-Commerce & Marketplaces', ['Crowdsourcing']],
  ['Education & Training', ['Personal Development']],
  ['Events & Ticketing', ['Wedding']],
  ['Family & Childcare', ['Child Care', 'Children', 'Family']],
  ['Food & Beverage', ['Organic']],
  ['Governance, Risk & Compliance', ['Compliance', 'Risk Management']],
  ['hardware', ['Computer', 'Consumer Electronics', 'Embedded Software', 'Field-Programmable Gate Array (FPGA)', 'GPU', 'Hardware', 'Internet of Things', 'Lighting', 'Quantum Computing', 'Semiconductor']],
  ['Home & Household', ['DIY', 'Furniture', 'Laundry and Dry-cleaning']],
  ['HR & Recruiting', ['Freelance']],
  ['Industrial & Manufacturing', ['Made to Order', 'Nanotechnology']],
  ['Lifestyle & Wellness', ['Lifestyle']],
  ['Logistics & Supply Chain', ['Packaging Services', 'Procurement']],
  ['Market & Product Research', ['Consumer Research', 'Market Research', 'Product Research']],
  ['Marketing', ['Consumer Reviews', 'Personalization', 'Reputation']],
  ['Media & Video', ['Digital Media']],
  ['Operating Systems & Browsers', ['Linux', 'Operating Systems', 'Web Browsers']],
  ['Productivity & Collaboration', ['Innovation Management', 'Product Management']],
  ['Publishing & News', ['Content']],
  ['Real Estate & PropTech', ['Coworking']],
  ['Rental & Sharing Services', ['Collaborative Consumption', 'Rental']],
  ['Retail', ['Consumer Goods', 'Flowers', 'Toys']],
  ['saas', ['Business Information Systems', 'Consumer Applications', 'Consumer Software', 'Enterprise Applications', 'Enterprise Software', 'Field Support', 'Freemium', 'Google', 'Management Information Systems', 'Online Portals', 'SaaS']],
  ['Sales & CRM', ['Business Development', 'Direct Sales']],
  ['Search & Discovery', ['Product Search', 'Search Engine', 'Semantic Search', 'Visual Search']],
  ['Small & Local Business', ['Local', 'Local Business', 'Small and Medium Businesses']],
  ['Social & Community', ['Facebook', 'LGBT', 'Photo Sharing', 'Professional Networking', 'Q&A']],
  ['Space & Aerospace', ['Air Transportation']],
  ['Startup Ecosystem', ['Incubators']],
  ['Travel & Hospitality', ['Guides']],
  ['Healthcare', ['Psychology']],
  ['Geospatial & Location Intelligence', ['Geospatial', 'GPS', 'Indoor Positioning', 'Location Based Services', 'Mapping Services', 'Navigation', 'Remote Sensing']],
  ['Deathcare', ['Funerals']],
  ['Government & Civic Tech', ['Politics', 'Smart Cities']],
])

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}.`)
  return payload
}

const loadTaxonomy = () => fetch(API).then((response) => parseResponse<Taxonomy>(response))

const assignedLabels = (taxonomy: Taxonomy) => new Set(taxonomy.groups.flatMap((group) => group.labels))

const createGroup = (name: string) => fetch(`${API}/groups`, {
  body: JSON.stringify({ name }),
  headers: { 'content-type': 'application/json' },
  method: 'POST',
}).then((response) => parseResponse<GroupMutation>(response))

const updateGroup = (group: Group, labels: string[]) => fetch(`${API}/groups/${encodeURIComponent(group.id)}`, {
  body: JSON.stringify({ labels: [...new Set([...group.labels, ...labels])] }),
  headers: { 'content-type': 'application/json' },
  method: 'PATCH',
}).then((response) => parseResponse<GroupMutation>(response))

const plannedLabels = new Set([...labelsByDestination.values()].flat())
if (plannedLabels.size !== [...labelsByDestination.values()].flat().length) {
  throw new Error('The grouping plan contains a duplicate label.')
}

const before = await loadTaxonomy()
const assignedBefore = assignedLabels(before)
const knownLabels = new Set(before.industries.map((industry) => industry.name))
const unknownPlannedLabels = [...plannedLabels].filter((label) => !knownLabels.has(label))
const ungroupedBefore = before.industries
  .map((industry) => industry.name)
  .filter((label) => !assignedBefore.has(label))
const unplanned = ungroupedBefore.filter((label) => !plannedLabels.has(label))

if (unknownPlannedLabels.length) {
  throw new Error(`Refusing to write: ${unknownPlannedLabels.length} planned label(s) are not in the current dataset: ${unknownPlannedLabels.join(', ')}`)
}

if (unplanned.length) {
  throw new Error(`Refusing to write: ${unplanned.length} current ungrouped label(s) are not in the reviewed plan: ${unplanned.join(', ')}`)
}

console.log(`Starting with ${ungroupedBefore.length} ungrouped labels.`)

if (process.argv.includes('--dry-run')) {
  console.log(`Dry run passed: all ${ungroupedBefore.length} current ungrouped labels are covered by the plan.`)
  process.exit(0)
}

for (const [destinationName, plannedForDestination] of labelsByDestination) {
  let taxonomy = await loadTaxonomy()
  const currentlyAssigned = assignedLabels(taxonomy)
  const labelsToAdd = plannedForDestination.filter((label) => !currentlyAssigned.has(label))
  if (!labelsToAdd.length) continue

  let destination = taxonomy.groups.find((group) => group.name.localeCompare(destinationName, undefined, { sensitivity: 'base' }) === 0)
  if (!destination) {
    const created = await createGroup(destinationName)
    destination = created.group
    if (!destination) throw new Error(`The API did not return the newly created “${destinationName}” group.`)
    taxonomy = { ...taxonomy, groups: created.groups }
    console.log(`Created “${destination.name}”.`)
  }

  const liveDestination = taxonomy.groups.find((group) => group.id === destination.id) ?? destination
  await updateGroup(liveDestination, labelsToAdd)
  console.log(`Added ${labelsToAdd.length} label(s) to “${destination.name}”.`)
}

const after = await loadTaxonomy()
const assignedAfter = assignedLabels(after)
const ungroupedAfter = after.industries
  .map((industry) => industry.name)
  .filter((label) => !assignedAfter.has(label))

if (ungroupedAfter.length) {
  throw new Error(`Grouping finished with ${ungroupedAfter.length} ungrouped label(s): ${ungroupedAfter.join(', ')}`)
}

console.log(`Finished with ${after.groups.length} groups and no ungrouped labels.`)
