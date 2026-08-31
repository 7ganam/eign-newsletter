import { useEffect, useMemo, useState } from 'react'
import riseUpData from '../assets/riseup-summit-2026-speakers.json'
import { ResizableDataTable } from './resizableColumns'

type NamedValue = {
  id?: number
  name?: string
  code?: string
}

type RiseUpActivity = {
  id: number
  type: string | null
  activity_type: NamedValue | null
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  requires_registration: boolean
  track: (NamedValue & { track_date?: string }) | null
  hall: NamedValue | null
}

type RiseUpSpeaker = {
  id: number
  attendee_id: number
  title: string | null
  passport_name: string
  certificate_name: string
  gender: string | null
  country: NamedValue | string | null
  city: NamedValue | string | null
  nationality: NamedValue | string | null
  institute: string | null
  occupation: string | null
  profile_picture_url: string | null
  profile_picture: string | null
  specialty: NamedValue | string | null
  biography: string | null
  social_links: Array<{ title?: string; url?: string }>
  activities: RiseUpActivity[]
}

type SortOrder = 'name-asc' | 'organisation-asc' | 'sessions-desc'
type SpeakerColumn = 'speaker' | 'role' | 'organisation' | 'profile' | 'specialty' | 'biography' | 'sessions' | 'record'

const SPEAKER_COLUMNS: Array<{ key: SpeakerColumn; label: string; defaultWidth: number }> = [
  { key: 'speaker', label: 'Speaker', defaultWidth: 280 },
  { key: 'role', label: 'Role', defaultWidth: 220 },
  { key: 'organisation', label: 'Organisation', defaultWidth: 240 },
  { key: 'profile', label: 'Profile', defaultWidth: 180 },
  { key: 'specialty', label: 'Specialty', defaultWidth: 180 },
  { key: 'biography', label: 'Biography', defaultWidth: 420 },
  { key: 'sessions', label: 'Sessions', defaultWidth: 430 },
  { key: 'record', label: 'Source record', defaultWidth: 170 },
]

const speakers = riseUpData.speakers as RiseUpSpeaker[]

const namedValue = (value: NamedValue | string | null) =>
  typeof value === 'string' ? value : value?.name ?? null

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

const formatSourceDate = (value: string | null) => {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatSessionTime = (activity: RiseUpActivity) => {
  const date = activity.track?.track_date
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${activity.track.track_date}T00:00:00`))
    : null
  const time = [activity.start_time, activity.end_time].filter(Boolean).join('–')
  return [date, time, activity.hall?.name].filter(Boolean).join(' · ')
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function Influencers2() {
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc')
  const [sessionsOnly, setSessionsOnly] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'RiseUp Summit 2026 speakers · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return speakers
      .filter((speaker) => !sessionsOnly || speaker.activities.length > 0)
      .filter((speaker) => {
        if (!normalizedQuery) return true
        const searchable = [
          speaker.passport_name,
          speaker.certificate_name,
          speaker.occupation,
          speaker.institute,
          speaker.biography,
          speaker.gender,
          namedValue(speaker.country),
          namedValue(speaker.city),
          namedValue(speaker.nationality),
          namedValue(speaker.specialty),
          ...speaker.activities.flatMap((activity) => [activity.title, activity.description, activity.track?.name, activity.hall?.name]),
        ].filter(Boolean).join(' ').toLocaleLowerCase()
        return searchable.includes(normalizedQuery)
      })
      .sort((left, right) => {
        if (sortOrder === 'sessions-desc') {
          return right.activities.length - left.activities.length || left.passport_name.localeCompare(right.passport_name)
        }
        if (sortOrder === 'organisation-asc') {
          return (left.institute ?? '').localeCompare(right.institute ?? '') || left.passport_name.localeCompare(right.passport_name)
        }
        return left.passport_name.localeCompare(right.passport_name)
      })
  }, [query, sessionsOnly, sortOrder])

  const clearFilters = () => {
    setQuery('')
    setSortOrder('name-asc')
    setSessionsOnly(false)
  }

  const filtersActive = Boolean(query || sessionsOnly || sortOrder !== 'name-asc')

  return (
    <div className="app-shell influencers-2-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
          <a href="/in-progress" aria-current="page">In progress</a>
        </nav>
      </header>

      <main className="riseup-speakers-main">
        <section className="influencer-directory riseup-speakers-directory" aria-labelledby="riseup-speakers-title">
          <header className="influencer-directory__header riseup-speakers-header">
            <div>
              <h2 id="riseup-speakers-title">RiseUp Summit 2026 speakers</h2>
              <p>Egypt Summit directory · Source data updated {formatSourceDate(riseUpData.source_data_updated_at)}</p>
            </div>
            <div>
              <span>{results.length} / {riseUpData.count}</span>
              <a href={riseUpData.source} target="_blank" rel="noreferrer">Open source ↗</a>
            </div>
          </header>

          <div className="filter-bar riseup-speakers-filters">
            <label className="search-field">
              <span className="sr-only">Search RiseUp speakers</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                placeholder="Search speakers, organisations, roles, biographies, or sessions"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Sort</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
                <option value="name-asc">Name A–Z</option>
                <option value="organisation-asc">Organisation A–Z</option>
                <option value="sessions-desc">Most sessions</option>
              </select>
            </label>
            <button
              className={`riseup-speakers-toggle${sessionsOnly ? ' is-active' : ''}`}
              type="button"
              aria-pressed={sessionsOnly}
              onClick={() => setSessionsOnly((current) => !current)}
            >
              Has sessions
            </button>
            <button className="reset-button" type="button" disabled={!filtersActive} onClick={clearFilters}>Clear</button>
          </div>

          <div className="result-meta">
            <span>{results.length} matching speakers</span>
            <span>{riseUpData.speakers.filter((speaker) => speaker.biography).length} biographies · {riseUpData.speakers.reduce((total, speaker) => total + speaker.activities.length, 0)} session assignments</span>
          </div>

          <div className="riseup-speakers-table-wrap">
            <ResizableDataTable
              className="company-table riseup-speakers-table"
              columns={SPEAKER_COLUMNS}
              storageKey="eign-riseup-speakers.column-widths.v1"
            >
              <tbody>
                {results.map((speaker, index) => {
                  const profileValues = [
                    speaker.gender,
                    namedValue(speaker.country),
                    namedValue(speaker.city),
                    namedValue(speaker.nationality),
                  ].filter((value): value is string => Boolean(value))

                  return (
                    <tr key={speaker.id}>
                      <td>
                        <div className="riseup-speaker-person">
                          <span className="riseup-speaker-avatar">
                            {speaker.profile_picture_url
                              ? <img src={speaker.profile_picture_url} alt="" loading="lazy" />
                              : initials(speaker.passport_name)}
                          </span>
                          <span>
                            <strong>{speaker.title ? `${speaker.title} ` : ''}{speaker.passport_name}</strong>
                            <small>#{String(index + 1).padStart(3, '0')}</small>
                          </span>
                        </div>
                      </td>
                      <td>{speaker.occupation || <span className="riseup-speaker-missing">—</span>}</td>
                      <td><strong className="riseup-speaker-organisation">{speaker.institute || '—'}</strong></td>
                      <td>
                        {profileValues.length
                          ? <div className="riseup-speaker-profile">{profileValues.map((value) => <span key={value}>{value}</span>)}</div>
                          : <span className="riseup-speaker-missing">—</span>}
                      </td>
                      <td>{namedValue(speaker.specialty) || <span className="riseup-speaker-missing">—</span>}</td>
                      <td>
                        {speaker.biography ? (
                          <details className="riseup-speaker-details">
                            <summary>{speaker.biography}</summary>
                            <p>{speaker.biography}</p>
                          </details>
                        ) : <span className="riseup-speaker-missing">—</span>}
                      </td>
                      <td>
                        {speaker.activities.length ? (
                          <details className="riseup-speaker-details riseup-speaker-sessions">
                            <summary>{speaker.activities.length} {speaker.activities.length === 1 ? 'session' : 'sessions'}</summary>
                            <ul>
                              {speaker.activities.map((activity) => (
                                <li key={activity.id}>
                                  <strong>{activity.title}</strong>
                                  <span>{[
                                    `Session ID ${activity.id}`,
                                    activity.type,
                                    activity.activity_type?.name,
                                    activity.track?.name,
                                    formatSessionTime(activity),
                                  ].filter(Boolean).join(' · ')}</span>
                                  {activity.requires_registration && <small>Registration required</small>}
                                  {activity.description && <p>{activity.description}</p>}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : <span className="riseup-speaker-missing">—</span>}
                      </td>
                      <td>
                        <div className="riseup-speaker-record">
                          <span>Speaker ID {speaker.id}</span>
                          <span>Attendee ID {speaker.attendee_id}</span>
                          {speaker.profile_picture_url && <a href={speaker.profile_picture_url} target="_blank" rel="noreferrer">Photo ↗</a>}
                          {speaker.social_links.map((link, linkIndex) => link.url && (
                            <a key={`${speaker.id}-${linkIndex}`} href={link.url} target="_blank" rel="noreferrer">{link.title || 'Social link'} ↗</a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </ResizableDataTable>
            {!results.length && <div className="empty-results">No RiseUp speakers match the current filters.</div>}
          </div>
        </section>
      </main>
    </div>
  )
}
