import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import { voronoiTreemap } from 'd3-voronoi-treemap'
import { formatMoney, formatNumber, initials } from './lib'
import { WorkspaceNav } from './WorkspaceNav'
import type {
  FundingLandscapeCompany,
  FundingLandscapeResponse,
} from './types'

type Point = [number, number]
type VoronoiPolygon = Point[] & { site: { x: number; y: number } }

type LandscapeDatum = {
  name: string
  industry?: string
  companyCount?: number
  fundingUsd?: number
  fundingTotalType?: string
  primaryFundingBasis?: string
  slug?: string | null
  logoUrl?: string | null
  website?: string | null
  aggregatedCompanyCount?: number
  children?: LandscapeDatum[]
}

type LandscapeNode = d3.HierarchyNode<LandscapeDatum> & {
  polygon: VoronoiPolygon
  parent: LandscapeNode | null
  children?: LandscapeNode[]
}

type ActiveCompany = FundingLandscapeCompany & { industry: string }
type ClickSound = 'soft' | 'crisp' | 'mechanical' | 'deep' | 'pop' | 'glass' | 'digital' | 'camera'
const CLICK_SOUNDS: ClickSound[] = ['soft', 'crisp', 'mechanical', 'deep', 'pop', 'glass', 'digital', 'camera']

type IndustryCallout = {
  node: LandscapeNode
  side: 'left' | 'right'
  anchor: Point
  desiredY: number
  y: number
}

type CompanyLogoMark = {
  node: LandscapeNode
  position: Point
  logoSize: number
  tier: 'standard' | 'compact' | 'micro'
  underTitle: boolean
}

type Bounds = {
  left: number
  right: number
  top: number
  bottom: number
}

const LANDSCAPE_COLORS = ['#70a8ff', '#ff9d66', '#66d7a8', '#ef8fc0', '#b28cff', '#51c9c1']

const seededRandom = (initialSeed: number) => {
  let seed = initialSeed
  return () => {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

const splitLabel = (label: string, maxCharacters: number) => {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxCharacters || !line) line = candidate
    else {
      lines.push(line)
      line = word
    }
    if (lines.length === 2) break
  }

  if (line && lines.length < 2) lines.push(line)
  if (lines.join(' ').length < label.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]$/, '')}…`
  }
  return lines.slice(0, 2)
}

const shortIndustry = (name: string) => name
  .replace('Developer Tools & AI Infrastructure', 'Developer Tools & AI')
  .replace('Business Operations & Productivity', 'Business Ops & Productivity')
  .replace('Automotive & Transportation', 'Automotive & Transport')

const disclosurePrefix = (type?: string) => /Minimum|Partial/.test(type ?? '') ? '≥' : ''

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const deltaX = end[0] - start[0]
  const deltaY = end[1] - start[1]
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (!lengthSquared) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const progress = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY
  ) / lengthSquared))
  return Math.hypot(
    point[0] - (start[0] + progress * deltaX),
    point[1] - (start[1] + progress * deltaY),
  )
}

const edgeClearance = (point: Point, polygon: VoronoiPolygon) => polygon.reduce(
  (minimum, start, index) => Math.min(
    minimum,
    distanceToSegment(point, start, polygon[(index + 1) % polygon.length]),
  ),
  Infinity,
)

const circleIntersectsBounds = (point: Point, radius: number, bounds?: Bounds) => {
  if (!bounds) return false
  const nearestX = Math.max(bounds.left, Math.min(point[0], bounds.right))
  const nearestY = Math.max(bounds.top, Math.min(point[1], bounds.bottom))
  return Math.hypot(point[0] - nearestX, point[1] - nearestY) < radius + 4
}

const findLogoPosition = (
  polygon: VoronoiPolygon,
  titlePoint: Point,
  logoSize: number,
  chartSize: number,
  titleBounds?: Bounds,
) => {
  const bounds = polygon.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point[0]),
      maxX: Math.max(box.maxX, point[0]),
      minY: Math.min(box.minY, point[1]),
      maxY: Math.max(box.maxY, point[1]),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
  const candidates: Point[] = [
    d3.polygonCentroid(polygon),
    [polygon.site.x, polygon.site.y],
  ]
  const divisions = 9

  for (let xIndex = 1; xIndex < divisions; xIndex += 1) {
    for (let yIndex = 1; yIndex < divisions; yIndex += 1) {
      candidates.push([
        bounds.minX + (bounds.maxX - bounds.minX) * xIndex / divisions,
        bounds.minY + (bounds.maxY - bounds.minY) * yIndex / divisions,
      ])
    }
  }

  const requiredEdgeClearance = logoSize / 2 + 3
  const preferredTitleClearance = logoSize / 2 + Math.max(38, chartSize * 0.065)
  return candidates
    .filter((point) => d3.polygonContains(polygon, point))
    .map((point) => {
      const clearance = edgeClearance(point, polygon)
      const titleDistance = Math.hypot(point[0] - titlePoint[0], point[1] - titlePoint[1])
      return {
        point,
        clearance,
        clearsTitle: !circleIntersectsBounds(point, logoSize / 2, titleBounds),
        score: (titleDistance >= preferredTitleClearance ? chartSize : 0)
          + titleDistance
          + clearance * 0.45,
      }
    })
    .filter(({ clearance, clearsTitle }) => clearance >= requiredEdgeClearance && clearsTitle)
    .sort((left, right) => right.score - left.score)[0]?.point ?? null
}

const distributeCallouts = (
  callouts: IndustryCallout[],
  minY: number,
  maxY: number,
  gap: number,
) => {
  const distributed = callouts
    .slice()
    .sort((left, right) => left.desiredY - right.desiredY)
    .map((callout) => ({ ...callout }))

  distributed.forEach((callout, index) => {
    callout.y = Math.max(callout.desiredY, index === 0 ? minY : distributed[index - 1].y + gap)
  })

  if (distributed.length && distributed[distributed.length - 1].y > maxY) {
    distributed[distributed.length - 1].y = maxY
    for (let index = distributed.length - 2; index >= 0; index -= 1) {
      distributed[index].y = Math.min(distributed[index].y, distributed[index + 1].y - gap)
    }
  }

  if (distributed.length && distributed[0].y < minY) {
    const offset = minY - distributed[0].y
    distributed.forEach((callout) => { callout.y += offset })
  }

  return distributed
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

function FundingLandscape({ data }: { data: FundingLandscapeResponse }) {
  const [chartRef, measuredWidth] = useElementWidth<HTMLDivElement>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const [failedLogos, setFailedLogos] = useState<Set<string>>(() => new Set())
  const [active, setActive] = useState<ActiveCompany>(() => ({
    ...data.industries[0].companies[0],
    industry: data.industries[0].name,
  }))
  const [locked, setLocked] = useState<ActiveCompany | null>(null)
  const [selectionPulse, setSelectionPulse] = useState(0)

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  const layout = useMemo(() => {
    if (!measuredWidth) return null
    const canvasWidth = Math.max(300, Math.min(measuredWidth, 980))
    const useCallouts = canvasWidth >= 800
    const calloutGutter = useCallouts
      ? Math.max(118, Math.min(150, canvasWidth * 0.155))
      : 0
    const size = canvasWidth - calloutGutter * 2
    const radius = size / 2 - 8
    const center: Point = [size / 2, size / 2]
    const clip = d3.range(0, Math.PI * 2, Math.PI / 90).map((angle) => [
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle),
    ] as Point)
    const hierarchyData: LandscapeDatum = {
      name: 'All companies',
      children: data.industries.map((industry) => ({
        name: industry.name,
        companyCount: industry.companyCount,
        children: industry.companies.map((company) => ({
          ...company,
          industry: industry.name,
        })),
      })),
    }
    const hierarchy = d3.hierarchy(hierarchyData)
      .sum((item) => item.fundingUsd ?? 0)
      .sort((left, right) => (right.value ?? 0) - (left.value ?? 0)) as LandscapeNode

    voronoiTreemap()
      .clip(clip)
      .convergenceRatio(0.004)
      .maxIterationCount(80)
      .prng(seededRandom(42))(hierarchy)

    const leaves = hierarchy.leaves() as LandscapeNode[]
    const industries = hierarchy.children as LandscapeNode[]
    const circleArea = Math.PI * radius * radius
    const companyAreaThreshold = circleArea * (size < 560 ? 0.016 : 0.006)
    const industryAreaThreshold = circleArea * (size < 560 ? 0.042 : 0.018)
    const path = d3.line<Point>().curve(d3.curveLinearClosed)
    const internalIndustries = industries
      .filter((node) => Math.abs(d3.polygonArea(node.polygon)) > industryAreaThreshold)
    const externalIndustries = industries
      .filter((node) => Math.abs(d3.polygonArea(node.polygon)) <= industryAreaThreshold)
    const industryTitleBounds = new Map(internalIndustries.map((node) => {
      const lines = splitLabel(shortIndustry(node.data.name), size < 560 ? 15 : 22)
      const firstBaseline = node.polygon.site.y - lines.length * 7
      const lastBaseline = firstBaseline + (lines.length - 1) * 15 + 16
      const textWidth = Math.max(
        ...lines.map((line) => line.length * 6.2),
        formatMoney(node.value).length * 6,
      )
      return [node, {
        left: node.polygon.site.x - textWidth / 2 - 16,
        right: node.polygon.site.x + textWidth / 2 + 16,
        top: firstBaseline - 18,
        bottom: lastBaseline + 10,
      } satisfies Bounds] as const
    }))
    const calloutCandidates = externalIndustries.map((node) => {
      const angle = Math.atan2(node.polygon.site.y - center[1], node.polygon.site.x - center[0])
      const side = Math.cos(angle) < 0 ? 'left' as const : 'right' as const
      return {
        node,
        side,
        anchor: [node.polygon.site.x + calloutGutter, node.polygon.site.y] as Point,
        // Keep labels in the same vertical order as their sector centers so
        // leader lines on one side can spread apart without crossing.
        desiredY: node.polygon.site.y,
        y: 0,
      }
    })
    const calloutGap = Math.max(32, Math.min(40, size / 12))
    const industryCallouts = useCallouts
      ? [
          ...distributeCallouts(calloutCandidates.filter(({ side }) => side === 'left'), 20, size - 20, calloutGap),
          ...distributeCallouts(calloutCandidates.filter(({ side }) => side === 'right'), 20, size - 20, calloutGap),
        ]
      : []
    const companyMarks = leaves
      .filter((node) => {
        const centroid = d3.polygonCentroid(node.polygon)
        return Math.abs(d3.polygonArea(node.polygon)) > companyAreaThreshold
          && Math.hypot(centroid[0] - node.parent!.polygon.site.x, centroid[1] - node.parent!.polygon.site.y) > size * 0.072
      })
      .map((node) => {
        const centroid = d3.polygonCentroid(node.polygon)
        const area = Math.abs(d3.polygonArea(node.polygon))
        const isAggregate = Boolean(node.data.aggregatedCompanyCount)
        const lines = isAggregate
          ? ['...']
          : splitLabel(node.data.name, Math.max(8, Math.floor(Math.sqrt(area) / 7)))
        const bounds = node.polygon.reduce(
          (box, point) => ({
            minX: Math.min(box.minX, point[0]),
            maxX: Math.max(box.maxX, point[0]),
            minY: Math.min(box.minY, point[1]),
            maxY: Math.max(box.maxY, point[1]),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        )
        const hasLogo = Boolean(node.data.logoUrl && !node.data.aggregatedCompanyCount)
        const logoSize = hasLogo ? Math.max(19, Math.min(size < 560 ? 28 : 44, Math.sqrt(area) * 0.17)) : 0
        const labelHeight = lines.length * 15 + (isAggregate ? 0 : 16)
        const contentHeight = labelHeight + (logoSize ? logoSize + 8 : 0)
        const contentWidth = Math.max(
          logoSize,
          ...lines.map((line) => line.length * 6.2),
          isAggregate ? 0 : formatMoney(node.data.fundingUsd).length * 6,
        )
        const fits = bounds.maxX - bounds.minX > contentWidth * 1.2
          && bounds.maxY - bounds.minY > contentHeight * 1.2
        const top = centroid[1] - contentHeight / 2

        return {
          node,
          centroid,
          lines,
          logoSize,
          logoY: top + logoSize / 2,
          labelY: top + (logoSize ? logoSize + 8 : 0),
          fits,
        }
      })
      .filter((mark) => mark.fits)
    const companyMarkByNode = new Map(companyMarks.map((mark) => [mark.node, mark]))
    const standardLogoAreaThreshold = circleArea * (size < 560 ? 0.009 : 0.0045)
    const compactLogoAreaThreshold = circleArea * (size < 560 ? 0.0042 : 0.0032)
    const microLogoAreaThreshold = circleArea * (size < 560 ? 0.0022 : 0.0016)
    const companyLogoMarks = leaves
      .filter((node) => node.data.logoUrl
        && !node.data.aggregatedCompanyCount
        && Math.abs(d3.polygonArea(node.polygon)) > microLogoAreaThreshold)
      .map((node): CompanyLogoMark | null => {
        const area = Math.abs(d3.polygonArea(node.polygon))
        const tier = area > standardLogoAreaThreshold
          ? 'standard'
          : area > compactLogoAreaThreshold ? 'compact' : 'micro'
        const existingMark = companyMarkByNode.get(node)
        const titleBounds = industryTitleBounds.get(node.parent!)
        const existingPosition: Point | null = existingMark?.logoSize
          ? [existingMark.centroid[0], existingMark.logoY]
          : null
        if (existingMark?.logoSize
          && existingPosition
          && !circleIntersectsBounds(existingPosition, existingMark.logoSize / 2, titleBounds)) {
          return {
            node,
            position: existingPosition,
            logoSize: existingMark.logoSize,
            tier,
            underTitle: false,
          }
        }

        let logoSize = tier === 'standard'
          ? Math.max(18, Math.min(size < 560 ? 25 : 36, Math.sqrt(area) * 0.21))
          : tier === 'compact'
            ? Math.max(10, Math.min(14, Math.sqrt(area) * 0.15))
            : Math.max(6, Math.min(8, Math.sqrt(area) * 0.28))
        let position = findLogoPosition(
          node.polygon,
          [node.parent!.polygon.site.x, node.parent!.polygon.site.y],
          logoSize,
          size,
          titleBounds,
        )

        const fallbackLogoSize = tier === 'standard' ? 16 : tier === 'compact' ? 9 : 5
        if (!position && logoSize > fallbackLogoSize) {
          logoSize = fallbackLogoSize
          position = findLogoPosition(
            node.polygon,
            [node.parent!.polygon.site.x, node.parent!.polygon.site.y],
            logoSize,
            size,
            titleBounds,
          )
        }

        if (position) return { node, position, logoSize, tier, underTitle: false }

        // A sector title should not erase an otherwise eligible company logo.
        // Keep the edge-clearance rules, but allow a muted logo beneath the title.
        position = findLogoPosition(
          node.polygon,
          [node.parent!.polygon.site.x, node.parent!.polygon.site.y],
          logoSize,
          size,
        )

        return position ? { node, position, logoSize, tier, underTitle: true } : null
      })
      .filter((mark): mark is CompanyLogoMark => Boolean(mark))

    return {
      canvasWidth,
      size,
      mapOffsetX: calloutGutter,
      useCallouts,
      clipPath: path(clip) ?? '',
      circleArea,
      leaves,
      industries,
      companyAreaThreshold,
      industryAreaThreshold,
      internalIndustries,
      externalIndustries,
      industryCallouts,
      companyMarks,
      companyLogoMarks,
      path,
    }
  }, [data, measuredWidth])

  const industryColors = useMemo(
    () => new Map(data.industries.map((industry, index) => [industry.name, LANDSCAPE_COLORS[index % LANDSCAPE_COLORS.length]])),
    [data],
  )

  const companyFromNode = (node: LandscapeNode): ActiveCompany => ({
    name: node.data.name,
    slug: node.data.slug,
    fundingUsd: node.data.fundingUsd ?? 0,
    fundingTotalType: node.data.fundingTotalType ?? 'Recorded total',
    primaryFundingBasis: node.data.primaryFundingBasis ?? 'Funding evidence on file',
    logoUrl: node.data.logoUrl,
    website: node.data.website,
    aggregatedCompanyCount: node.data.aggregatedCompanyCount,
    industry: node.data.industry ?? node.parent?.data.name ?? 'Unclassified',
  })
  const companyKey = (company: ActiveCompany) => `${company.industry}:${company.slug ?? company.name}`
  const soundForCompany = (company: ActiveCompany) => {
    const key = companyKey(company)
    let hash = 2_166_136_261
    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index)
      hash = Math.imul(hash, 16_777_619)
    }
    return CLICK_SOUNDS[(hash >>> 0) % CLICK_SOUNDS.length]
  }
  const activateNode = (node: LandscapeNode) => setActive(companyFromNode(node))
  const playClickSound = (sound: ClickSound = 'soft') => {
    if (!window.AudioContext) return

    const context = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = context

    const play = () => {
      const now = context.currentTime
      const tone = ({
        type,
        from,
        to,
        delay = 0,
        duration,
        volume,
      }: {
        type: OscillatorType
        from: number
        to: number
        delay?: number
        duration: number
        volume: number
      }) => {
        const start = now + delay
        const oscillator = context.createOscillator()
        const gain = context.createGain()

        oscillator.type = type
        oscillator.frequency.setValueAtTime(from, start)
        oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.003)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + duration + 0.005)
      }

      if (sound === 'crisp') {
        tone({ type: 'sine', from: 1_700, to: 620, duration: 0.032, volume: 0.05 })
      } else if (sound === 'mechanical') {
        tone({ type: 'square', from: 390, to: 180, duration: 0.048, volume: 0.028 })
        tone({ type: 'triangle', from: 1_200, to: 460, delay: 0.008, duration: 0.032, volume: 0.022 })
      } else if (sound === 'deep') {
        tone({ type: 'sine', from: 190, to: 72, duration: 0.105, volume: 0.08 })
      } else if (sound === 'pop') {
        tone({ type: 'sine', from: 340, to: 105, duration: 0.075, volume: 0.072 })
      } else if (sound === 'glass') {
        tone({ type: 'sine', from: 2_200, to: 1_760, duration: 0.16, volume: 0.036 })
        tone({ type: 'sine', from: 3_150, to: 2_480, delay: 0.004, duration: 0.11, volume: 0.018 })
      } else if (sound === 'digital') {
        tone({ type: 'square', from: 620, to: 980, duration: 0.046, volume: 0.026 })
        tone({ type: 'triangle', from: 980, to: 1_420, delay: 0.05, duration: 0.045, volume: 0.032 })
      } else if (sound === 'camera') {
        tone({ type: 'square', from: 980, to: 380, duration: 0.022, volume: 0.024 })
        tone({ type: 'square', from: 520, to: 190, delay: 0.036, duration: 0.052, volume: 0.036 })
      } else {
        tone({ type: 'triangle', from: 520, to: 240, duration: 0.055, volume: 0.06 })
      }
    }

    if (context.state === 'suspended') {
      void context.resume().then(play).catch(() => undefined)
    } else {
      play()
    }
  }
  const lockNode = (node: LandscapeNode) => {
    const company = companyFromNode(node)
    playClickSound(soundForCompany(company))
    setSelectionPulse((current) => current + 1)
    setLocked(company)
    setActive(company)
  }
  const lockedKey = locked ? companyKey(locked) : null
  const lockedNode = lockedKey
    ? layout?.leaves.find((node) => companyKey(companyFromNode(node)) === lockedKey)
    : null
  const activeIsLocked = lockedKey ? companyKey(active) === lockedKey : false
  const lockedIndustry = lockedNode
    ? lockedNode.data.industry ?? lockedNode.parent?.data.name ?? 'Unclassified'
    : null
  const lockedSurfaceOpacity = lockedNode
    ? Math.min(0.94, lockedNode.data.aggregatedCompanyCount
        ? 0.44
        : 0.56 + 0.38 * Math.sqrt((lockedNode.value ?? 0) / (lockedNode.parent?.value ?? 1)))
    : 0

  return (
    <div className="funding-atlas">
      <div className="funding-atlas__chart" ref={chartRef}>
        {layout && (
          <svg
            viewBox={`0 0 ${layout.canvasWidth} ${layout.size}`}
            role="img"
            aria-labelledby="funding-atlas-title funding-atlas-description"
            onPointerLeave={() => {
              if (locked) setActive(locked)
            }}
          >
            <title id="funding-atlas-title">Company funding landscape by industry</title>
            <desc id="funding-atlas-description">
              A circular Voronoi treemap of {formatNumber(data.summary.companyCount)} companies. Industry partitions and company cells are proportional to recorded total funding.
            </desc>
            <g transform={`translate(${layout.mapOffsetX} 0)`}>
              <g>
                {layout.leaves.map((node, index) => {
                  const industry = node.data.industry ?? node.parent?.data.name ?? 'Unclassified'
                  const company = companyFromNode(node)
                  const isLocked = locked ? companyKey(company) === companyKey(locked) : false
                  const opacity = node.data.aggregatedCompanyCount
                    ? 0.22
                    : 0.42 + 0.42 * Math.sqrt((node.value ?? 0) / (node.parent?.value ?? 1))
                  return (
                    <path
                      key={`${industry}-${node.data.name}-${index}`}
                      className={`funding-atlas__company${isLocked ? ' funding-atlas__company--locked' : ''}`}
                      d={layout.path(node.polygon) ?? ''}
                      fill={industryColors.get(industry)}
                      fillOpacity={opacity}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isLocked}
                      aria-label={`${node.data.name}, ${industry}, ${formatMoney(node.data.fundingUsd)}`}
                      onPointerEnter={() => activateNode(node)}
                      onPointerDown={() => activateNode(node)}
                      onClick={() => lockNode(node)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          lockNode(node)
                        }
                      }}
                    />
                  )
                })}
              </g>

              <g aria-hidden="true">
                {layout.industries.map((node) => (
                  <path key={node.data.name} className="funding-atlas__industry-boundary" d={layout.path(node.polygon) ?? ''} />
                ))}
                <path className="funding-atlas__outer-boundary" d={layout.clipPath} />
              </g>

              {lockedNode && (
                <g
                  key={`${lockedKey}-${selectionPulse}`}
                  className="funding-atlas__selection-marker"
                  aria-hidden="true"
                >
                  <path className="funding-atlas__selection-depth-shadow" d={layout.path(lockedNode.polygon) ?? ''} />
                  <path
                    className="funding-atlas__selection-depth-surface"
                    d={layout.path(lockedNode.polygon) ?? ''}
                    fill={industryColors.get(lockedIndustry!)}
                    fillOpacity={lockedSurfaceOpacity}
                  />
                  <path className="funding-atlas__selection-depth-highlight" d={layout.path(lockedNode.polygon) ?? ''} />
                </g>
              )}

              <g aria-hidden="true">
                {layout.companyLogoMarks
                  .map(({ node, position, logoSize, tier, underTitle }) => {
                    const logoUrl = node.data.logoUrl!
                    const failed = failedLogos.has(logoUrl)
                    const clipId = `funding-logo-${node.data.slug?.replace(/[^a-z0-9-]/gi, '-') ?? node.data.name.replace(/[^a-z0-9-]/gi, '-')}`
                    return (
                      <g
                        key={`logo-${node.data.industry}-${node.data.name}`}
                        className={`funding-atlas__logo funding-atlas__logo--${tier}${underTitle ? ' funding-atlas__logo--under-title' : ''}`}
                        data-company={node.data.name}
                        data-logo-tier={tier}
                        data-under-title={underTitle ? 'true' : undefined}
                        transform={`translate(${position[0]} ${position[1]})`}
                      >
                        <defs>
                          <clipPath id={clipId}><circle r={logoSize / 2} /></clipPath>
                        </defs>
                        <circle
                          className="funding-atlas__logo-disc"
                          r={logoSize / 2 + (tier === 'standard' ? 2 : tier === 'compact' ? 1.25 : 0.75)}
                        />
                        {failed ? (
                          <text className="funding-atlas__logo-fallback" y="1">{initials(node.data.name)}</text>
                        ) : (
                          <image
                            href={logoUrl}
                            x={-logoSize / 2}
                            y={-logoSize / 2}
                            width={logoSize}
                            height={logoSize}
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#${clipId})`}
                            onError={() => setFailedLogos((current) => new Set(current).add(logoUrl))}
                          />
                        )}
                      </g>
                    )
                  })}
              </g>

              <g aria-hidden="true">
                {layout.companyMarks.map(({ node, centroid, lines, labelY }) => (
                  <text key={`${node.data.industry}-${node.data.name}`} className="funding-atlas__company-label" x={centroid[0]} y={labelY}>
                    {lines.map((line, index) => <tspan key={line} x={centroid[0]} dy={index === 0 ? 0 : 15}>{line}</tspan>)}
                    {!node.data.aggregatedCompanyCount && (
                      <tspan className="funding-atlas__company-value" x={centroid[0]} dy="16">
                        {disclosurePrefix(node.data.fundingTotalType)}{formatMoney(node.data.fundingUsd)}
                      </tspan>
                    )}
                  </text>
                ))}
              </g>

              <g aria-hidden="true">
                {layout.internalIndustries.map((node) => {
                  const lines = splitLabel(shortIndustry(node.data.name), layout.size < 560 ? 15 : 22)
                  return (
                    <text key={node.data.name} className="funding-atlas__industry-label" x={node.polygon.site.x} y={node.polygon.site.y - lines.length * 7}>
                      {lines.map((line, index) => <tspan key={line} x={node.polygon.site.x} dy={index === 0 ? 0 : 15}>{line}</tspan>)}
                      <tspan x={node.polygon.site.x} dy="16">{formatMoney(node.value)}</tspan>
                    </text>
                  )
                })}
              </g>
            </g>

            {layout.useCallouts && (
              <g className="funding-atlas__callouts">
                {layout.industryCallouts.map(({ node, side, anchor, y }) => {
                  const elbowX = side === 'left'
                    ? layout.mapOffsetX - 12
                    : layout.mapOffsetX + layout.size + 12
                  const lineEndX = side === 'left'
                    ? layout.mapOffsetX - 22
                    : layout.mapOffsetX + layout.size + 22
                  const textX = side === 'left' ? 4 : layout.canvasWidth - 4
                  return (
                    <g key={node.data.name}>
                      <title>{node.data.name}, {formatMoney(node.value)}</title>
                      <polyline
                        className="funding-atlas__callout-line"
                        points={`${anchor[0]},${anchor[1]} ${elbowX},${y} ${lineEndX},${y}`}
                      />
                      <circle className="funding-atlas__callout-dot" cx={anchor[0]} cy={anchor[1]} r="2.2" />
                      <text
                        className="funding-atlas__callout-label"
                        x={textX}
                        y={y - 3}
                        textAnchor={side === 'left' ? 'start' : 'end'}
                      >
                        <tspan>{shortIndustry(node.data.name)}</tspan>
                        <tspan className="funding-atlas__callout-value" x={textX} dy="12">{formatMoney(node.value)}</tspan>
                      </text>
                    </g>
                  )
                })}
              </g>
            )}
          </svg>
        )}

        {layout && !layout.useCallouts && (
          <section className="funding-atlas__industry-key" aria-labelledby="funding-atlas-key-title">
            <header>
              <p id="funding-atlas-key-title">Small territories</p>
              <span>{layout.externalIndustries.length} industries below the in-map label threshold</span>
            </header>
            <ul>
              {layout.externalIndustries.map((node) => {
                const industry = data.industries.find(({ name }) => name === node.data.name)!
                return (
                  <li key={industry.name}>
                    <button
                      type="button"
                      onClick={() => {
                        const company = industry.companies[0]
                        setActive({ ...company, industry: industry.name })
                      }}
                    >
                      <span className="funding-atlas__key-swatch" style={{ background: industryColors.get(industry.name) }} />
                      <span>{shortIndustry(industry.name)}</span>
                      <strong>{formatMoney(industry.fundingUsd)}</strong>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      <aside className="funding-atlas__rail" aria-live="polite">
        <div className="funding-atlas__rail-header">
          <p className="funding-atlas__rail-index">Selected territory</p>
          {locked && (
            <button
              type="button"
              className="funding-atlas__lock"
              aria-label={`Unlock ${locked.name}`}
              title={`Unlock ${locked.name}`}
              onClick={() => {
                playClickSound(soundForCompany(locked))
                setLocked(null)
              }}
            >
              <span>Locked</span>
              <strong>{locked.name}</strong>
              <b aria-hidden="true">×</b>
            </button>
          )}
        </div>
        <div className={`funding-atlas__selection${activeIsLocked ? ' funding-atlas__selection--locked' : ''}`}>
          <div className="funding-atlas__selection-logo" aria-hidden="true">
            {active.logoUrl && !failedLogos.has(active.logoUrl) ? (
              <img
                src={active.logoUrl}
                alt=""
                onError={() => setFailedLogos((current) => new Set(current).add(active.logoUrl!))}
              />
            ) : (
              <span>{active.aggregatedCompanyCount ? 'Σ' : initials(active.name)}</span>
            )}
          </div>
          <span className="funding-atlas__selection-industry">{active.industry}</span>
          <h2 title={active.name}>{active.name}</h2>
          {active.website && (
            <a
              className="funding-atlas__selection-website"
              href={/^https?:\/\//i.test(active.website) ? active.website : `https://${active.website}`}
              target="_blank"
              rel="noreferrer"
              title={active.website}
            >
              <span>{active.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')}</span>
              <b aria-hidden="true">↗</b>
            </a>
          )}
          <strong title={`${disclosurePrefix(active.fundingTotalType)}${formatMoney(active.fundingUsd, false)}`}>
            {disclosurePrefix(active.fundingTotalType)}{formatMoney(active.fundingUsd, false)}
          </strong>
          <p>{active.fundingTotalType}</p>
          <p>{active.primaryFundingBasis}</p>
        </div>
        <dl className="funding-atlas__facts">
          <div><dt>Recorded capital</dt><dd>{formatMoney(data.summary.totalFundingUsd)}</dd></div>
          <div><dt>Industries</dt><dd>{formatNumber(data.industries.length)}</dd></div>
          <div><dt>Company records</dt><dd>{formatNumber(data.summary.companyCount)}</dd></div>
          <div><dt>Named cells</dt><dd>{formatNumber(data.summary.namedCompanyCount)}</dd></div>
        </dl>
      </aside>
    </div>
  )
}

export function Visualisations() {
  const [data, setData] = useState<FundingLandscapeResponse | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    fetch('/api/visualisations/funding-landscape')
      .then((response) => {
        if (!response.ok) throw new Error(`The data service returned ${response.status}.`)
        return response.json() as Promise<FundingLandscapeResponse>
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the funding landscape.'))
  }

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Funding landscape · EIGN Data Workspace'
    load()
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="app-shell visualisations-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies and funding records</span></div>
        <WorkspaceNav active="posts" />
      </header>

      <main id="top" className="visualisations-main">
        <section className="visualisation-section" aria-labelledby="landscape-heading">
          <header className="visualisation-section__header">
            <div>
              <h1 id="landscape-heading">Funding landscape</h1>
              <p>Company area = recorded <code>totalFundingUsd</code>. Color and boundaries = industry. Select a cell to inspect its funding basis.</p>
            </div>
            <dl className="visualisation-overview" aria-label="Dataset summary">
              <div>
                <dt>Companies</dt>
                <dd>{data ? formatNumber(data.summary.companyCount) : '—'}</dd>
              </div>
              <div>
                <dt>Industries</dt>
                <dd>{data ? formatNumber(data.industries.length) : '—'}</dd>
              </div>
              <div>
                <dt>Recorded capital</dt>
                <dd>{data ? formatMoney(data.summary.totalFundingUsd) : '—'}</dd>
              </div>
            </dl>
          </header>

          {error ? (
            <div className="visualisation-error">
              <p>{error}</p>
              <button className="button button--dark" onClick={load}>Try again</button>
            </div>
          ) : data ? (
            <FundingLandscape data={data} />
          ) : (
            <div className="visualisation-loading" aria-label="Loading funding landscape"><span /></div>
          )}

          <footer className="visualisation-method">
            <p><strong>Area</strong> Recorded <code>totalFundingUsd</code></p>
            <p><strong>Partition</strong> Company <code>industry</code></p>
            <p><strong>Disclosure</strong> ≥ marks minimum or partial totals</p>
            {data && <p><strong>Coverage</strong> {formatNumber(data.summary.namedCompanyCount)} named; {formatNumber(data.summary.aggregatedCompanyCount)} grouped</p>}
          </footer>
        </section>
      </main>
    </div>
  )
}
