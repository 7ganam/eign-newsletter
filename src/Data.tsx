import { useEffect } from 'react'
import { WorkspaceNav } from './WorkspaceNav'

const dataPages = [
  {
    href: '/research',
    index: '01',
    kind: 'Web search · non-Crunchbase',
    title: 'Non-Crunchbase Startups',
    source: 'Web-search research records',
    backing: 'data/companies/web-search-startups.json',
    tone: 'curated',
  },
  {
    href: '/middle-east-crunchbase',
    index: '02',
    kind: 'Crunchbase scrape · Middle East',
    title: 'Middle East Crunchbase Companies',
    source: 'Crunchbase profiles + PR enrichment lookup (logos and primary groups)',
    backing: 'data/companies/crunchbase-middle-east-company-profiles.json · data/companies/crunchbase-middle-east-company-name-logo-primary-group.json',
    tone: 'snapshot',
  },
  {
    href: '/yc-crunchbase',
    index: '03',
    kind: 'Crunchbase scrape · YC filter',
    title: 'YC Crunchbase Pulls',
    source: 'Crunchbase-scraped profiles filtered to the YC company set',
    backing: 'data/companies/crunchbase-yc-company-profiles.json',
    tone: 'enrichment',
  },
  {
    href: '/software-companies',
    index: '04',
    kind: 'LinkedIn + Kattch · software companies',
    title: 'Software Companies',
    source: 'LinkedIn and Kattch review',
    backing: 'assets/companies/software-companies-middle-east.csv · assets/companies/software-companies-non-middle-east-review.csv',
    tone: 'software',
  },
] as const

export function Data() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Data sources · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-shell data-index-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Dataset provenance and access</span></div>
        <WorkspaceNav active="data" />
      </header>

      <main className="data-index-main">
        <header className="data-index-hero">
          <div>
            <span className="data-index-kicker">Source index · 4 datasets</span>
            <h1>Know where the data came from.</h1>
          </div>
          <p>These pages look similar, but they serve different purposes: web-search research, Crunchbase profile scrapes across Middle East and YC markets, and a LinkedIn/Kattch software-company review.</p>
        </header>

        <section className="data-index-list" aria-label="Company data pages">
          {dataPages.map((page) => (
            <a className={`data-index-card data-index-card--${page.tone}`} href={page.href} aria-label={`${page.title}; ${page.kind}; source: ${page.source}`} key={page.href}>
              <div className="data-index-card__number" aria-hidden="true">{page.index}</div>
              <div className="data-index-card__dataset">
                <span className="data-index-card__kind">{page.kind}</span>
                <h2>{page.title}</h2>
              </div>
              <div className="data-index-card__provenance">
                <span>{page.source}</span>
                <code>{page.backing}</code>
              </div>
              <div className="data-index-card__link">
                <span>Open data</span>
                <b aria-hidden="true">↗</b>
              </div>
            </a>
          ))}
        </section>

        <aside className="data-index-note">
          <strong>How to use these pages</strong>
          <p>Use <a href="/research">Non-Crunchbase Startups</a> for the EIGN research list. Use <a href="/yc-crunchbase">YC Crunchbase Pulls</a> when you want only Crunchbase-scraped data for the YC-filtered set.</p>
        </aside>
      </main>
    </div>
  )
}
