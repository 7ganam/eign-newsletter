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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResearchLedger ? <ResearchLedger /> : isPosts ? (
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
