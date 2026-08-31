declare module 'd3-voronoi-treemap' {
  import type { HierarchyNode } from 'd3-hierarchy'

  type Point = [number, number]

  type VoronoiTreemapLayout = {
    <Datum>(root: HierarchyNode<Datum>): void
    clip(points: Point[]): VoronoiTreemapLayout
    convergenceRatio(value: number): VoronoiTreemapLayout
    maxIterationCount(value: number): VoronoiTreemapLayout
    minWeightRatio(value: number): VoronoiTreemapLayout
    prng(value: () => number): VoronoiTreemapLayout
  }

  export function voronoiTreemap(): VoronoiTreemapLayout
}
