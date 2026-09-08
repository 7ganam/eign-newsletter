import { useEffect } from 'react'
import { WorkspaceNav } from './WorkspaceNav'

const inProgressItems = [
  { href: '/people-notion-table', label: 'People · Notion-style table' },
  { href: '/influencers', label: 'Influencers' },
  { href: '/influncers-2', label: 'RiseUp Data' },
  { href: '/middle-east-organizations', label: 'Middle East Organizations' },
  { href: '/middle-east-crunchbase', label: 'Middle East Crunchbase Companies' },
  { href: '/yc-crunchbase', label: 'YC Crunchbase Pulls' },
  { href: '/industry-taxonomy', label: 'YC Industry Groups' },
  { href: '/middle-east-founders', label: 'Middle East Founders' },
  { href: '/middle-east-vcs', label: 'VC’s' },
  { href: '/middle-east-vc-people', label: 'VC People' },
  { href: '/leap-data', label: 'Leap Data' },
  { href: '/valid-links', label: 'Valid links' },
] as const

export function InProgress() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'In progress · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-shell in-progress-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Active research and editorial work</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="in-progress-main">
        <header className="posts-heading">
          <div><h1>In progress</h1><p>Active research, analysis, and editorial work.</p></div>
          <span>{inProgressItems.length} items</span>
        </header>

        <section className="in-progress-list" aria-label="In-progress items">
          {inProgressItems.map((item) => (
            <a className="in-progress-item" href={item.href} key={item.href}>
              <span className="in-progress-item__status" aria-hidden="true" />
              <strong>{item.label}</strong>
              <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
            </a>
          ))}
        </section>
      </main>
    </div>
  )
}
