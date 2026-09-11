import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ResearchLedger } from './ResearchLedger'
import './styles.css'

const isResearchLedger = window.location.pathname === '/research'
const isVisualisations = window.location.pathname === '/visualisations'
const isInfluencers = window.location.pathname === '/influencers'
const isSoftwareCompanies = window.location.pathname === '/software-companies'
const isData = window.location.pathname === '/data'
const isNewsletters = window.location.pathname === '/newsletters'
const isValidLinks = window.location.pathname === '/valid-links'
const isPosts = window.location.pathname === '/posts'
const isIndustryFundingPost = window.location.pathname === '/posts/industry-funding-by-year'
const isIndustryTaxonomy = window.location.pathname === '/industry-taxonomy'
const isInProgress = window.location.pathname === '/in-progress'
const isInfluencers2 = window.location.pathname === '/influncers-2'
const isLeapData = window.location.pathname === '/leap-data'
const isMiddleEastOrganizations = window.location.pathname === '/middle-east-organizations'
const isMiddleEastCrunchbase = window.location.pathname === '/middle-east-crunchbase'
const isYcCrunchbase = window.location.pathname === '/yc-crunchbase'
const isMiddleEastFounders = window.location.pathname === '/middle-east-founders'
const isMiddleEastVcs = window.location.pathname === '/middle-east-vcs'
const isMiddleEastVcPeople = window.location.pathname === '/middle-east-vc-people'
const isUnifiedPeople = window.location.pathname === '/people'
const isPeopleNotionTable = window.location.pathname === '/people-notion-table'
const isLeadResearch = window.location.pathname === '/lead-research' || window.location.pathname === '/lead-research/strategies'
const Visualisations = lazy(async () => {
  const module = await import('./Visualisations')
  return { default: module.Visualisations }
})
const Influencers = lazy(async () => {
  const module = await import('./Influencers')
  return { default: module.Influencers }
})
const SoftwareCompanies = lazy(async () => {
  const module = await import('./SoftwareCompanies')
  return { default: module.SoftwareCompanies }
})
const Data = lazy(async () => {
  const module = await import('./Data')
  return { default: module.Data }
})
const Newsletters = lazy(async () => {
  const module = await import('./Newsletters')
  return { default: module.Newsletters }
})
const ValidLinks = lazy(async () => {
  const module = await import('./ValidLinks')
  return { default: module.ValidLinks }
})
const Posts = lazy(async () => {
  const module = await import('./Posts')
  return { default: module.Posts }
})
const IndustryFundingPost = lazy(async () => {
  const module = await import('./IndustryFundingPost')
  return { default: module.IndustryFundingPost }
})
const IndustryTaxonomy = lazy(async () => {
  const module = await import('./IndustryTaxonomy')
  return { default: module.IndustryTaxonomy }
})
const InProgress = lazy(async () => {
  const module = await import('./InProgress')
  return { default: module.InProgress }
})
const Influencers2 = lazy(async () => {
  const module = await import('./Influencers2')
  return { default: module.Influencers2 }
})
const LeapData = lazy(async () => {
  const module = await import('./LeapData')
  return { default: module.LeapData }
})
const MiddleEastOrganizations = lazy(async () => {
  const module = await import('./MiddleEastOrganizations')
  return { default: module.MiddleEastOrganizations }
})
const MiddleEastCrunchbase = lazy(async () => {
  const module = await import('./MiddleEastCrunchbase')
  return { default: module.MiddleEastCrunchbase }
})
const YcCrunchbase = lazy(async () => {
  const module = await import('./YcCrunchbase')
  return { default: module.YcCrunchbase }
})
const MiddleEastFounders = lazy(async () => {
  const module = await import('./MiddleEastFounders')
  return { default: module.MiddleEastFounders }
})
const MiddleEastVcs = lazy(async () => {
  const module = await import('./MiddleEastVcs')
  return { default: module.MiddleEastVcs }
})
const MiddleEastVcPeople = lazy(async () => {
  const module = await import('./MiddleEastVcPeople')
  return { default: module.MiddleEastVcPeople }
})
const UnifiedPeople = lazy(async () => {
  const module = await import('./UnifiedPeople')
  return { default: module.UnifiedPeople }
})
const PeopleNotionTable = lazy(async () => {
  const module = await import('./PeopleNotionTable')
  return { default: module.PeopleNotionTable }
})
const LeadResearch = lazy(async () => {
  const module = await import('./LeadResearch')
  return { default: module.LeadResearch }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResearchLedger ? <ResearchLedger /> : isLeadResearch ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Saudi lead research"><div className="loading-mark">EI</div></main>}>
        <LeadResearch />
      </Suspense>
    ) : isPeopleNotionTable ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Notion-style people table"><div className="loading-mark">EI</div></main>}>
        <PeopleNotionTable />
      </Suspense>
    ) : isUnifiedPeople ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading unified people"><div className="loading-mark">EI</div></main>}>
        <UnifiedPeople />
      </Suspense>
    ) : isMiddleEastVcPeople ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Middle East VC people"><div className="loading-mark">EI</div></main>}>
        <MiddleEastVcPeople />
      </Suspense>
    ) : isMiddleEastVcs ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Middle East VCs"><div className="loading-mark">EI</div></main>}>
        <MiddleEastVcs />
      </Suspense>
    ) : isMiddleEastFounders ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Middle East founders"><div className="loading-mark">EI</div></main>}>
        <MiddleEastFounders />
      </Suspense>
    ) : isYcCrunchbase ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading YC Crunchbase pulls"><div className="loading-mark">EI</div></main>}>
        <YcCrunchbase />
      </Suspense>
    ) : isMiddleEastCrunchbase ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Middle East Crunchbase companies"><div className="loading-mark">EI</div></main>}>
        <MiddleEastCrunchbase />
      </Suspense>
    ) : isMiddleEastOrganizations ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading Middle East organizations"><div className="loading-mark">EI</div></main>}>
        <MiddleEastOrganizations />
      </Suspense>
    ) : isLeapData ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading LEAP speaker data"><div className="loading-mark">EI</div></main>}>
        <LeapData />
      </Suspense>
    ) : isInfluencers2 ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading influncers 2"><div className="loading-mark">EI</div></main>}>
        <Influencers2 />
      </Suspense>
    ) : isInProgress ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading in-progress work"><div className="loading-mark">EI</div></main>}>
        <InProgress />
      </Suspense>
    ) : isIndustryTaxonomy ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading industry groups"><div className="loading-mark">EI</div></main>}>
        <IndustryTaxonomy />
      </Suspense>
    ) : isIndustryFundingPost ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading funding by industry post"><div className="loading-mark">EI</div></main>}>
        <IndustryFundingPost />
      </Suspense>
    ) : isPosts ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading posts"><div className="loading-mark">EI</div></main>}>
        <Posts />
      </Suspense>
    ) : isValidLinks ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading valid links"><div className="loading-mark">EI</div></main>}>
        <ValidLinks />
      </Suspense>
    ) : isData ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading data sources"><div className="loading-mark">EI</div></main>}>
        <Data />
      </Suspense>
    ) : isNewsletters ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading newsletter research"><div className="loading-mark">EI</div></main>}>
        <Newsletters />
      </Suspense>
    ) : isVisualisations ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading visualisations"><div className="loading-mark">EI</div></main>}>
        <Visualisations />
      </Suspense>
    ) : isInfluencers ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading influencer index"><div className="loading-mark">EI</div></main>}>
        <Influencers />
      </Suspense>
    ) : isSoftwareCompanies ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading software companies"><div className="loading-mark">EI</div></main>}>
        <SoftwareCompanies />
      </Suspense>
    ) : <App />}
  </StrictMode>,
)
