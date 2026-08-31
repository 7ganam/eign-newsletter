import { useEffect } from 'react'

export function Posts() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Posts · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-shell posts-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Saved analytical views from local datasets</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts" aria-current="page">Posts</a>
        </nav>
      </header>

      <main className="posts-main">
        <header className="posts-heading">
          <div><h1>Posts</h1><p>Analytical views built from the local EIGN datasets.</p></div>
          <span>1 post</span>
        </header>

        <section className="posts-grid" aria-label="Available posts">
          <a className="post-card" href="/visualisations">
            <div className="post-card__preview" aria-hidden="true">
              <span /><span /><span /><span /><span /><span />
            </div>
            <div className="post-card__body">
              <span className="post-card__type">Funding analysis</span>
              <h2>Funding landscape</h2>
              <p>Explore recorded company funding as an industry-grouped capital map and inspect individual company territories.</p>
              <span className="post-card__action">Open post <b aria-hidden="true">→</b></span>
            </div>
          </a>
        </section>
      </main>
    </div>
  )
}
