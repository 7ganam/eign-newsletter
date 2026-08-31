import { useEffect } from 'react'
import { WorkspaceNav } from './WorkspaceNav'

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
          <span>5 items</span>
        </header>

        <section className="in-progress-list" aria-label="In-progress items">
          <a className="in-progress-item" href="/people">
            <span className="in-progress-item__status" aria-hidden="true" />
            <strong>Unified People</strong>
            <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
          </a>
          <a className="in-progress-item" href="/influncers-2">
            <span className="in-progress-item__status" aria-hidden="true" />
            <strong>RiseUp Data</strong>
            <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
          </a>
          <a className="in-progress-item" href="/middle-east-organizations">
            <span className="in-progress-item__status" aria-hidden="true" />
            <strong>Middle East Organizations</strong>
            <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
          </a>
          <a className="in-progress-item" href="/leap-data">
            <span className="in-progress-item__status" aria-hidden="true" />
            <strong>Leap Data</strong>
            <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
          </a>
          <a className="in-progress-item" href="/valid-links">
            <span className="in-progress-item__status" aria-hidden="true" />
            <strong>Valid links</strong>
            <span className="in-progress-item__action">Open <b aria-hidden="true">→</b></span>
          </a>
        </section>
      </main>
    </div>
  )
}
