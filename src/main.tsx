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
const isNewsletters = window.location.pathname === '/newsletters'
const isValidLinks = window.location.pathname === '/valid-links'
const isPosts = window.location.pathname === '/posts'
const isInProgress = window.location.pathname === '/in-progress'
const isInfluencers2 = window.location.pathname === '/influncers-2'
const isLeapData = window.location.pathname === '/leap-data'
const isMiddleEastOrganizations = window.location.pathname === '/middle-east-organizations'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResearchLedger ? <ResearchLedger /> : isMiddleEastOrganizations ? (
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
    ) : isPosts ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading posts"><div className="loading-mark">EI</div></main>}>
        <Posts />
      </Suspense>
    ) : isValidLinks ? (
      <Suspense fallback={<main className="loading-view" aria-label="Loading valid links"><div className="loading-mark">EI</div></main>}>
        <ValidLinks />
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
