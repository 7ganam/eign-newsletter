import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import type { EChartProps } from './EChart'
import { dateEditorValue, InlineEdit } from './editableCells'
import { displayList, formatDate, formatMoney, formatNumber, initials, truncateLabel } from './lib'
import { ResizableDataTable } from './resizableColumns'
import { restoreStoredChoice, saveStoredChoice } from './tablePreferences'
import type {
  CompanyDetailResponse,
  CompanyListResponse,
  DashboardData,
  FundingRound,
} from './types'

const LazyEChart = lazy(async () => {
  const module = await import('./EChart')
  return { default: module.EChart }
})

function ChartView(props: EChartProps) {
  return (
    <Suspense fallback={<div className={`chart chart--loading ${props.className ?? ''}`} aria-hidden="true" />}>
      <LazyEChart {...props} />
    </Suspense>
  )
}

const COMPANY_SORTS = ['funding_desc', 'funding_asc', 'name_asc', 'name_desc'] as const
type CompanySort = typeof COMPANY_SORTS[number]

type CompanyFilters = {
  q: string
  industry: string
  batch: string
  sort: CompanySort
}

const COMPANY_SORT_STORAGE_KEY = 'eign-dashboard.companies.row-sort.v1'

const defaultFilters: CompanyFilters = {
  q: '',
  industry: '',
  batch: '',
  sort: 'funding_desc',
}

const TOP_COMPANY_COLUMNS = [
  { key: 'rank', label: '#', defaultWidth: 52 },
  { key: 'company', label: 'Company', defaultWidth: 230 },
  { key: 'industry', label: 'Industry', defaultWidth: 170 },
  { key: 'batch', label: 'Batch', defaultWidth: 95 },
  { key: 'funding', label: 'Funding', defaultWidth: 140 },
] as const

const RECENT_ROUND_COLUMNS = [
  { key: 'date', label: 'Date', defaultWidth: 120 },
  { key: 'company', label: 'Company', defaultWidth: 230 },
  { key: 'stage', label: 'Stage', defaultWidth: 150 },
  { key: 'amount', label: 'Amount', defaultWidth: 140 },
] as const

const COMPANY_COLUMNS = [
  { key: 'company', label: 'Company', defaultWidth: 310 },
  { key: 'industry', label: 'Industry', defaultWidth: 220 },
  { key: 'businessType', label: 'Business type', defaultWidth: 180 },
  { key: 'batch', label: 'Batch', defaultWidth: 110 },
  { key: 'funding', label: 'Recorded funding', defaultWidth: 180 },
  { key: 'rounds', label: 'Rounds', defaultWidth: 85 },
  { key: 'status', label: 'Status', defaultWidth: 145 },
] as const

const FUNDING_ROUND_COLUMNS = [
  { key: 'date', label: 'Date', defaultWidth: 110 },
  { key: 'type', label: 'Type', defaultWidth: 170 },
  { key: 'amount', label: 'Amount', defaultWidth: 125 },
  { key: 'evidence', label: 'Evidence', defaultWidth: 320 },
  { key: 'source', label: 'Source', defaultWidth: 105 },
] as const

type RecordCollection = 'companies' | 'rounds'
type SaveRecordCell = (collection: RecordCollection, recordId: string, field: string, value: unknown) => Promise<void>

const numericCellValue = (value: string) => value.trim() === '' ? null : Number(value)

const patchRecordCell = async (collection: RecordCollection, recordId: string, field: string, value: unknown) => {
  const response = await fetch(`/api/records/${collection}/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ field, value }),
  })
  const result = await response.json().catch(() => null) as { error?: string; value?: unknown } | null
  if (!response.ok) throw new Error(result?.error || `The data service returned ${response.status}.`)
  return result?.value
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debouncedValue
}

function CompanyLogo({ name, src, size = 'medium' }: { name: string; src?: string | null; size?: 'small' | 'medium' | 'large' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <span className={`company-logo company-logo--${size}`} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M7 4h7v7M14 4 6 12" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 10v4H4V6h4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function LoadingView() {
  return <main className="loading-view"><span className="loading-spinner" /> Loading local data…</main>
}

function ErrorView({ message, retry }: { message: string; retry: () => void }) {
  return (
    <main className="error-view">
      <h1>Local data service unavailable</h1>
      <p>{message}</p>
      <button onClick={retry}>Try again</button>
      <code>pnpm start</code>
    </main>
  )
}

function RoundsTable({ onSave, rounds }: { onSave: SaveRecordCell; rounds: FundingRound[] }) {
  return (
    <div className="drawer-table-wrap">
      <ResizableDataTable className="drawer-table" columns={FUNDING_ROUND_COLUMNS} storageKey="eign-dashboard.funding-rounds.column-widths.v1">
        <tbody>
          {rounds.map((round, index) => {
            const investors = displayList(round.leadInvestors) || displayList(round.otherInvestors)
            return (
              <tr key={`${round.round}-${round.announcementDate}-${index}`}>
                <td><InlineEdit ariaLabel="round date" inputType="date" value={dateEditorValue(round.announcementDate)} onSave={(value) => onSave('rounds', round.__recordId, 'announcementDate', value || null)}>{formatDate(round.announcementDate)}</InlineEdit></td>
                <td><InlineEdit ariaLabel="round type" value={round.round || ''} onSave={(value) => onSave('rounds', round.__recordId, 'round', value)}><strong>{round.round || round.roundStage || (round.recordType === 'accelerator_commitment' ? 'Accelerator' : 'Funding event')}</strong><small>{round.instrument || ''}</small></InlineEdit></td>
                <td><InlineEdit ariaLabel="round amount" inputType="number" value={round.amountUsd == null ? '' : String(round.amountUsd)} onSave={(value) => onSave('rounds', round.__recordId, 'amountUsd', numericCellValue(value))}>{formatMoney(round.amountUsd, false)}{round.inferredMinimum && <small>Minimum</small>}</InlineEdit></td>
                <td><InlineEdit ariaLabel="round evidence" value={round.evidenceBasis || ''} onSave={(value) => onSave('rounds', round.__recordId, 'evidenceBasis', value)}>{round.evidenceBasis || investors || '—'}{round.includedInTotal === false && <small>Excluded from total</small>}</InlineEdit></td>
                <td><InlineEdit ariaLabel="round source" inputType="url" value={round.primarySource || ''} onSave={(value) => onSave('rounds', round.__recordId, 'primarySource', value)}>{round.primarySource || round.notionUrl ? <a href={round.primarySource || round.notionUrl || '#'} target="_blank" rel="noreferrer">Open <ExternalIcon /></a> : '—'}</InlineEdit></td>
              </tr>
            )
          })}
        </tbody>
      </ResizableDataTable>
      {!rounds.length && <p className="empty-note">No linked funding records.</p>}
    </div>
  )
}

function CompanyDrawer({ detail, loading, onClose, onSave }: { detail: CompanyDetailResponse | null; loading: boolean; onClose: () => void; onSave: SaveRecordCell }) {
  const company = detail?.company

  return (
    <div className="drawer-shell" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="company-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-toolbar">
          <span>Company record</span>
          <button onClick={onClose} aria-label="Close company details">×</button>
        </header>
        {loading || !company ? (
          <div className="drawer-loading"><span className="loading-spinner" /> Loading company…</div>
        ) : (
          <div className="drawer-content">
            <section className="drawer-company-heading">
              <CompanyLogo name={company.name} src={company.logoUrl} size="large" />
              <div>
                <h2 id="drawer-title">{company.name}</h2>
                <p>{company.industry || 'Unclassified'} · {company.businessType || 'Unknown business type'} · {company.batch || 'No batch'}</p>
              </div>
              <span className="status-pill">{company.fundingReconciliationStatus || 'indexed'}</span>
            </section>

            <div className="drawer-links">
              {company.website && <a href={company.website} target="_blank" rel="noreferrer">Website <ExternalIcon /></a>}
              {company.notionUrl && <a href={company.notionUrl} target="_blank" rel="noreferrer">Notion record <ExternalIcon /></a>}
              <a href={`/research?company=${encodeURIComponent(company.slug)}`}>Open in Startups</a>
            </div>

            <section className="drawer-metrics">
              <MetricCard label="Recorded funding" value={formatMoney(company.totalFundingUsd, false)} detail={company.fundingTotalType || 'Recorded total'} />
              <MetricCard label="Funding events" value={formatNumber(detail.rounds.length)} detail="Linked round records" />
              <MetricCard label="Verified events" value={formatMoney(company.verifiedFundingEventsTotalUsd)} detail="Verified event total" />
            </section>

            <section className="drawer-block">
              <h3>Company summary</h3>
              <p>{company.summary || 'No company summary is available.'}</p>
            </section>

            <section className="drawer-block drawer-facts">
              <h3>Funding data</h3>
              <dl>
                <div><dt>Primary basis</dt><dd>{company.primaryFundingBasis || '—'}</dd></div>
                <div><dt>Sources</dt><dd>{company.fundingSources || '—'}</dd></div>
                <div><dt>History completeness</dt><dd>{company.fundingHistoryCompleteness || '—'}</dd></div>
                <div><dt>Unexplained funding</dt><dd>{formatMoney(company.unexplainedFundingUsd, false)}</dd></div>
              </dl>
            </section>

            <section className="drawer-block">
              <div className="drawer-block__heading"><h3>Funding history</h3><span>{detail.rounds.length} records</span></div>
              <RoundsTable onSave={onSave} rounds={detail.rounds} />
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}

export function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardError, setDashboardError] = useState('')
  const [filters, setFilters] = useState<CompanyFilters>(() => ({
    ...defaultFilters,
    sort: restoreStoredChoice(COMPANY_SORT_STORAGE_KEY, defaultFilters.sort, COMPANY_SORTS),
  }))
  const [page, setPage] = useState(1)
  const [companyResults, setCompanyResults] = useState<CompanyListResponse | null>(null)
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<CompanyDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [industryMetric, setIndustryMetric] = useState<'companies' | 'fundingUsd'>('companies')
  const debouncedSearch = useDebouncedValue(filters.q, 250)

  const loadDashboard = useCallback(async () => {
    setDashboardError('')
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error(`The data service returned ${response.status}.`)
      setDashboard(await response.json() as DashboardData)
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to reach the local data service.')
    }
  }, [])

  const saveRecordCell = useCallback<SaveRecordCell>(async (collection, recordId, field, value) => {
    const savedValue = await patchRecordCell(collection, recordId, field, value)
    if (collection === 'companies') {
      setDashboard((current) => current ? {
        ...current,
        topCompanies: current.topCompanies.map((company) => company.__recordId === recordId ? { ...company, [field]: savedValue } : company),
        recentRounds: current.recentRounds.map((round) => round.companyRecordId === recordId && field === 'name' ? { ...round, companyName: savedValue as string } : round),
      } : current)
      setCompanyResults((current) => current ? {
        ...current,
        items: current.items.map((company) => company.__recordId === recordId ? { ...company, [field]: savedValue } : company),
      } : current)
      setDetail((current) => current?.company.__recordId === recordId ? {
        ...current,
        company: { ...current.company, [field]: savedValue },
      } : current)
    } else {
      setDashboard((current) => current ? {
        ...current,
        recentRounds: current.recentRounds.map((round) => round.__recordId === recordId ? { ...round, [field]: savedValue } : round),
      } : current)
      setDetail((current) => current ? {
        ...current,
        rounds: current.rounds.map((round) => round.__recordId === recordId ? { ...round, [field]: savedValue } : round),
      } : current)
    }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  useEffect(() => {
    saveStoredChoice(COMPANY_SORT_STORAGE_KEY, filters.sort)
  }, [filters.sort])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), limit: '15', sort: filters.sort })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (filters.industry) params.set('industry', filters.industry)
    if (filters.batch) params.set('batch', filters.batch)

    setCompaniesLoading(true)
    fetch(`/api/companies?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Company query failed')
        return response.json() as Promise<CompanyListResponse>
      })
      .then(setCompanyResults)
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error(error)
      })
      .finally(() => { if (!controller.signal.aborted) setCompaniesLoading(false) })
    return () => controller.abort()
  }, [debouncedSearch, filters.batch, filters.industry, filters.sort, page])

  useEffect(() => {
    if (!selectedSlug) {
      setDetail(null)
      return
    }
    const controller = new AbortController()
    setDetailLoading(true)
    fetch(`/api/companies/${encodeURIComponent(selectedSlug)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Company detail query failed')
        return response.json() as Promise<CompanyDetailResponse>
      })
      .then(setDetail)
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error(error)
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [selectedSlug])

  useEffect(() => {
    if (!selectedSlug) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setSelectedSlug(null)
    document.body.classList.add('drawer-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('drawer-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedSlug])

  const chartBase = useMemo(() => ({
    animationDuration: 220,
    textStyle: { fontFamily: 'IBM Plex Sans', color: '#3c4043' },
  }), [])

  const industryOption = useMemo<EChartsCoreOption>(() => {
    if (!dashboard) return {}
    const data = [...dashboard.industries].sort((a, b) => b[industryMetric] - a[industryMetric]).slice(0, 12).reverse()
    return {
      ...chartBase,
      grid: { left: 8, right: 26, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: unknown) => {
        const point = (params as Array<{ name: string; value: number }>)[0]
        return `<strong>${point.name}</strong><br/>${industryMetric === 'companies' ? `${formatNumber(point.value)} companies` : formatMoney(point.value, false)}`
      } },
      xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#edf0f2' } }, axisLabel: { color: '#5f6368', formatter: (value: number) => industryMetric === 'fundingUsd' ? formatMoney(value) : value } },
      yAxis: { type: 'category', data: data.map((item) => truncateLabel(item.industry, 31)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3c4043', fontSize: 11 } },
      series: [{ type: 'bar', data: data.map((item) => item[industryMetric]), barWidth: 12, itemStyle: { color: '#1a73e8' } }],
    }
  }, [chartBase, dashboard, industryMetric])

  const timelineOption = useMemo<EChartsCoreOption>(() => {
    if (!dashboard) return {}
    return {
      ...chartBase,
      grid: { left: 14, right: 18, top: 34, bottom: 12, containLabel: true },
      tooltip: { trigger: 'axis', formatter: (params: unknown) => {
        const points = params as Array<{ axisValue: string; value: number; seriesName: string }>
        const funding = points.find((point) => point.seriesName === 'Funding')
        const count = points.find((point) => point.seriesName === 'Rounds')
        return `<strong>${funding?.axisValue ?? ''}</strong><br/>${formatMoney(funding?.value, false)}<br/>${formatNumber(count?.value)} rounds`
      } },
      legend: { top: 0, right: 0, textStyle: { color: '#5f6368', fontSize: 10 }, itemWidth: 12, itemHeight: 3 },
      xAxis: { type: 'category', data: dashboard.timeline.map((item) => item.month), boundaryGap: false, axisLine: { lineStyle: { color: '#dadce0' } }, axisTick: { show: false }, axisLabel: { color: '#5f6368', fontSize: 10, formatter: (value: string) => value.endsWith('-01') ? value.slice(0, 4) : '' } },
      yAxis: [
        { type: 'value', axisLabel: { color: '#5f6368', fontSize: 10, formatter: (value: number) => formatMoney(value) }, splitLine: { lineStyle: { color: '#edf0f2' } } },
        { type: 'value', show: false },
      ],
      series: [
        { name: 'Funding', type: 'line', data: dashboard.timeline.map((item) => item.fundingUsd), symbol: 'none', lineStyle: { color: '#1a73e8', width: 2 }, areaStyle: { color: 'rgba(26, 115, 232, 0.08)' } },
        { name: 'Rounds', type: 'bar', yAxisIndex: 1, data: dashboard.timeline.map((item) => item.rounds), barMaxWidth: 5, itemStyle: { color: 'rgba(24, 128, 56, 0.35)' } },
      ],
    }
  }, [chartBase, dashboard])

  const stageOption = useMemo<EChartsCoreOption>(() => {
    if (!dashboard) return {}
    const stages = dashboard.stages.slice(0, 8).reverse()
    return {
      ...chartBase,
      grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#edf0f2' } }, axisLabel: { color: '#5f6368', fontSize: 10 } },
      yAxis: { type: 'category', data: stages.map((stage) => truncateLabel(stage.stage, 24)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3c4043', fontSize: 10 } },
      series: [{ type: 'bar', data: stages.map((stage) => stage.rounds), barWidth: 11, itemStyle: { color: '#f29900' } }],
    }
  }, [chartBase, dashboard])

  const batchOption = useMemo<EChartsCoreOption>(() => {
    if (!dashboard) return {}
    const batches = dashboard.batches.slice(0, 12).reverse()
    return {
      ...chartBase,
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#edf0f2' } }, axisLabel: { color: '#5f6368', fontSize: 10 } },
      yAxis: { type: 'category', data: batches.map((item) => item.batch), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3c4043', fontSize: 10 } },
      series: [{ type: 'bar', data: batches.map((item) => item.companies), barWidth: 11, itemStyle: { color: '#188038' } }],
    }
  }, [chartBase, dashboard])

  const updateFilter = <Key extends keyof CompanyFilters>(key: Key, value: CompanyFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  if (dashboardError) return <ErrorView message={dashboardError} retry={() => void loadDashboard()} />
  if (!dashboard) return <LoadingView />

  const reconciliationRate = dashboard.summary.companies ? dashboard.summary.reconciledCompanies / dashboard.summary.companies : 0
  const filtersActive = Boolean(filters.q || filters.industry || filters.batch || filters.sort !== 'funding_desc')

  return (
    <div className="app-shell">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies and funding records</span></div>
        <nav aria-label="Primary navigation">
          <a href="/" aria-current="page">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
        </nav>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-context">
          <div><strong>Dataset overview</strong><span>Local JSON files · Updated {formatDate(dashboard.summary.updatedAt, 'long')}</span></div>
          <span className="connection-status"><i /> Connected</span>
        </div>

        <section className="metric-strip" aria-label="Dataset metrics">
          <MetricCard label="Companies" value={formatNumber(dashboard.summary.companies)} detail={`${formatNumber(dashboard.summary.fundedCompanies)} with recorded funding`} />
          <MetricCard label="Funding records" value={formatNumber(dashboard.summary.rounds)} detail="Financing and accelerator events" />
          <MetricCard label="Recorded funding" value={formatMoney(dashboard.summary.totalFundingUsd)} detail="Company-level recorded total" />
          <MetricCard label="Reconciled coverage" value={`${Math.round(reconciliationRate * 100)}%`} detail={`${formatNumber(dashboard.summary.reconciledCompanies)} company histories`} />
        </section>

        <section className="dashboard-grid" aria-label="Dataset charts">
          <article className="analysis-panel analysis-panel--timeline">
            <header><div><h2>Funding over time</h2><p>Monthly announced funding and event count</p></div><span>{dashboard.timeline.length} months</span></header>
            <ChartView option={timelineOption} className="chart--timeline" ariaLabel="Monthly announced funding and funding round count" />
          </article>

          <article className="analysis-panel analysis-panel--industry">
            <header>
              <div><h2>Industry distribution</h2><p>Top 12 industries</p></div>
              <div className="segmented-control" aria-label="Industry metric">
                <button className={industryMetric === 'companies' ? 'active' : ''} onClick={() => setIndustryMetric('companies')}>Companies</button>
                <button className={industryMetric === 'fundingUsd' ? 'active' : ''} onClick={() => setIndustryMetric('fundingUsd')}>Funding</button>
              </div>
            </header>
            <ChartView option={industryOption} className="chart--industry" ariaLabel={`Top industries by ${industryMetric}`} />
          </article>

          <article className="analysis-panel analysis-panel--stage">
            <header><div><h2>Funding-stage mix</h2><p>Share of financing events</p></div></header>
            <ChartView option={stageOption} className="chart--stage" ariaLabel="Funding events by stage" />
          </article>

          <article className="analysis-panel analysis-panel--batch">
            <header><div><h2>Largest batches</h2><p>Top 12 cohorts by company count</p></div></header>
            <ChartView option={batchOption} className="chart--batch" ariaLabel="Largest batches by company count" />
          </article>

          <article className="analysis-panel analysis-panel--leaders">
            <header><div><h2>Companies by recorded funding</h2><p>Highest company-level totals</p></div><span className="table-edit-hint">Pencil or double-click to edit</span></header>
            <div className="compact-table-wrap">
              <ResizableDataTable className="compact-table" columns={TOP_COMPANY_COLUMNS} storageKey="eign-dashboard.top-companies.column-widths.v1">
                <tbody>{dashboard.topCompanies.map((company, index) => (
                  <tr key={company.slug} onClick={() => setSelectedSlug(company.slug)}>
                    <td>{index + 1}</td>
                    <td><InlineEdit ariaLabel={`${company.name} name`} value={company.name} onSave={(value) => saveRecordCell('companies', company.__recordId, 'name', value)}><CompanyLogo name={company.name} src={company.logoUrl} size="small" /><strong>{company.name}</strong></InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${company.name} industry`} value={company.industry || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'industry', value)}>{company.industry || '—'}</InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${company.name} batch`} value={company.batch || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'batch', value)}>{company.batch || '—'}</InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${company.name} funding`} inputType="number" value={company.totalFundingUsd == null ? '' : String(company.totalFundingUsd)} onSave={(value) => saveRecordCell('companies', company.__recordId, 'totalFundingUsd', numericCellValue(value))}>{formatMoney(company.totalFundingUsd)}</InlineEdit></td>
                  </tr>
                ))}</tbody>
              </ResizableDataTable>
            </div>
          </article>

          <article className="analysis-panel analysis-panel--recent">
            <header><div><h2>Recent funding records</h2><p>Latest dated events</p></div><span className="table-edit-hint">Pencil or double-click to edit</span></header>
            <div className="compact-table-wrap">
              <ResizableDataTable className="compact-table" columns={RECENT_ROUND_COLUMNS} storageKey="eign-dashboard.recent-rounds.column-widths.v1">
                <tbody>{dashboard.recentRounds.map((round) => (
                  <tr key={`${round.companySlug}-${round.announcementDate}`} onClick={() => setSelectedSlug(round.companySlug)}>
                    <td><InlineEdit ariaLabel={`${round.companyName} round date`} inputType="date" value={dateEditorValue(round.announcementDate)} onSave={(value) => saveRecordCell('rounds', round.__recordId, 'announcementDate', value || null)}>{formatDate(round.announcementDate)}</InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${round.companyName} name`} disabled={!round.companyRecordId} value={round.companyName} onSave={(value) => saveRecordCell('companies', round.companyRecordId!, 'name', value)}><CompanyLogo name={round.companyName} src={round.logoUrl} size="small" /><strong>{round.companyName}</strong></InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${round.companyName} round stage`} value={round.roundStage || ''} onSave={(value) => saveRecordCell('rounds', round.__recordId, 'roundStage', value)}>{round.roundStage || 'Funding event'}</InlineEdit></td>
                    <td><InlineEdit ariaLabel={`${round.companyName} round amount`} inputType="number" value={round.amountUsd == null ? '' : String(round.amountUsd)} onSave={(value) => saveRecordCell('rounds', round.__recordId, 'amountUsd', numericCellValue(value))}>{formatMoney(round.amountUsd)}</InlineEdit></td>
                  </tr>
                ))}</tbody>
              </ResizableDataTable>
            </div>
          </article>
        </section>

        <section className="company-explorer" id="company-table">
          <header className="section-toolbar"><div><h2>Company table</h2><p>Search, filter, sort, edit, and open a company record</p></div><div><span className="table-edit-hint">Pencil or double-click to edit</span><a href="/research">Open Startups →</a></div></header>
          <div className="filter-bar">
            <label className="search-field"><span className="sr-only">Search companies</span><SearchIcon /><input type="search" placeholder="Search name, summary, or slug" value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} /></label>
            <label><span>Industry</span><select value={filters.industry} onChange={(event) => updateFilter('industry', event.target.value)}><option value="">All industries</option>{dashboard.industries.map((item) => <option key={item.industry} value={item.industry}>{item.industry}</option>)}</select></label>
            <label><span>Batch</span><select value={filters.batch} onChange={(event) => updateFilter('batch', event.target.value)}><option value="">All batches</option>{dashboard.batches.map((item) => <option key={item.batch} value={item.batch}>{item.batch}</option>)}</select></label>
            <label><span>Sort</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as CompanySort)}><option value="funding_desc">Funding: high to low</option><option value="funding_asc">Funding: low to high</option><option value="name_asc">Name: A–Z</option><option value="name_desc">Name: Z–A</option></select></label>
            {filtersActive && <button className="reset-button" onClick={() => { setFilters(defaultFilters); setPage(1) }}>Clear filters</button>}
          </div>

          <div className="result-meta"><span>{companiesLoading ? 'Loading…' : `${formatNumber(companyResults?.pagination.total)} matching companies`}</span><span>Page {companyResults?.pagination.page ?? page} of {companyResults?.pagination.pages ?? 1}</span></div>
          <div className={`company-table-wrap ${companiesLoading ? 'is-loading' : ''}`}>
            <ResizableDataTable className="company-table" columns={COMPANY_COLUMNS} storageKey="eign-dashboard.companies.column-widths.v1">
              <tbody>{companyResults?.items.map((company) => (
                <tr key={company.slug} onClick={() => setSelectedSlug(company.slug)}>
                  <td><InlineEdit ariaLabel={`${company.name} name`} value={company.name} onSave={(value) => saveRecordCell('companies', company.__recordId, 'name', value)}><div className="company-cell"><CompanyLogo name={company.name} src={company.logoUrl} /><span><strong>{company.name}</strong><small>{company.slug}</small></span></div></InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} industry`} value={company.industry || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'industry', value)}>{company.industry || 'Unclassified'}</InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} business type`} value={company.businessType || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'businessType', value)}>{company.businessType || '—'}</InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} batch`} value={company.batch || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'batch', value)}>{company.batch || '—'}</InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} recorded funding`} inputType="number" value={company.totalFundingUsd == null ? '' : String(company.totalFundingUsd)} onSave={(value) => saveRecordCell('companies', company.__recordId, 'totalFundingUsd', numericCellValue(value))}><strong>{formatMoney(company.totalFundingUsd)}</strong><small>{company.fundingTotalType || 'Recorded total'}</small></InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} round count`} disabled value={String(company.roundCount)} onSave={async () => undefined}>{company.roundCount}</InlineEdit></td>
                  <td><InlineEdit ariaLabel={`${company.name} reconciliation status`} value={company.fundingReconciliationStatus || ''} onSave={(value) => saveRecordCell('companies', company.__recordId, 'fundingReconciliationStatus', value)}><span className="status-pill">{company.fundingReconciliationStatus || 'indexed'}</span></InlineEdit></td>
                </tr>
              ))}</tbody>
            </ResizableDataTable>
            {!companiesLoading && companyResults?.items.length === 0 && <div className="empty-results">No companies match the current filters.</div>}
          </div>
          <div className="pagination"><button disabled={page <= 1 || companiesLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>{page} / {companyResults?.pagination.pages ?? 1}</span><button disabled={page >= (companyResults?.pagination.pages ?? 1) || companiesLoading} onClick={() => setPage((current) => current + 1)}>Next</button></div>
        </section>
      </main>

      {selectedSlug && <CompanyDrawer detail={detail} loading={detailLoading} onClose={() => setSelectedSlug(null)} onSave={saveRecordCell} />}
    </div>
  )
}
