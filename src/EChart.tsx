import { useEffect, useRef } from 'react'
import { BarChart, LineChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([
  BarChart,
  LineChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

export type EChartProps = {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
}

export function EChart({ option, className = '', ariaLabel }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
    chart.setOption(option)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(chartRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [option])

  return <div ref={chartRef} className={`chart ${className}`} role="img" aria-label={ariaLabel} />
}
