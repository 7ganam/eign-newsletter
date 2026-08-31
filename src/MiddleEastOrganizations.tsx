import { useEffect } from 'react'
import entityData from '../assets/riseup-summit-2026-entities.json'
import { ResizableDataTable } from './resizableColumns'
import { WorkspaceNav } from './WorkspaceNav'

type Organization = {
  id: string
  name: string
  person_ids: string[]
}

type Person = {
  id: string
  name: string
}

const ORGANIZATION_COLUMNS = [
  { key: 'organization', label: 'Organization', defaultWidth: 340 },
  { key: 'people', label: 'People', defaultWidth: 760 },
] as const

const organizations = entityData.organizations as Organization[]
const peopleById = new Map(
  (entityData.people as Person[]).map((person) => [person.id, person.name]),
)
const organizationRows = organizations.map((organization) => ({
  ...organization,
  people: organization.person_ids
    .map((personId) => peopleById.get(personId))
    .filter((name): name is string => Boolean(name)),
}))

export function MiddleEastOrganizations() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Middle East Organizations · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-shell middle-east-organizations-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="middle-east-organizations-main">
        <section className="influencer-directory riseup-speakers-directory" aria-labelledby="middle-east-organizations-title">
          <header className="influencer-directory__header riseup-speakers-header">
            <div>
              <h2 id="middle-east-organizations-title">Middle East Organizations</h2>
              <p>Organizations named in the RiseUp Summit 2026 speaker data</p>
            </div>
            <div>
              <span>{entityData.counts.organizations} organizations</span>
              <a href={entityData.source} target="_blank" rel="noreferrer">Open source ↗</a>
            </div>
          </header>

          <div className="result-meta middle-east-organizations-meta">
            <span>{entityData.counts.person_organization_relationships} people-to-organization links</span>
            <span>{entityData.counts.people_without_organization} speakers have no organization in the source</span>
          </div>

          <div className="middle-east-organizations-table-wrap">
            <ResizableDataTable
              className="company-table middle-east-organizations-table"
              columns={ORGANIZATION_COLUMNS}
              storageKey="eign-middle-east-organizations.column-widths.v2"
            >
              <tbody>
                {organizationRows.map((organization) => (
                  <tr key={organization.id}>
                    <td className="middle-east-organization-name">{organization.name}</td>
                    <td><div className="middle-east-organization-people">{organization.people.join(', ')}</div></td>
                  </tr>
                ))}
              </tbody>
            </ResizableDataTable>
          </div>
        </section>
      </main>
    </div>
  )
}
