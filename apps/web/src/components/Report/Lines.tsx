"use client"

import { PlotlyChart } from "@/components/Report/charts/PlotlyChart"
import { type Line, lineChart, type LineFormat } from "@/lib/report/line-chart"
import { REPORT_COLORS } from "@/lib/report/plotly-theme"

const SWATCHES = [REPORT_COLORS.strategy, REPORT_COLORS.benchmark, REPORT_COLORS.highlight]

type LinesProps = {
  title: string
  format: LineFormat
  series: Line[]
  mark?: { label: string; value: number }
  // Fill under the first line, for something that is measured from a level, such as how far below its peak it was
  area?: boolean
  height?: number
}

// Lines over time, with a tooltip that reads each one at the date under the pointer. The legend is page text above the chart, so it wraps on
// a narrow screen.
export function Lines({ title, format, series, mark, area, height = 300 }: LinesProps) {
  const { data, layout } = lineChart({ series, format, mark, area })

  return (
    <div className="flex flex-col gap-3">
      <ul className="text-ink-200 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        {series.map(({ name }, i) => (
          <li key={name} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-[3px] w-4 rounded-full" style={{ background: SWATCHES[i] }} />
            {name}
          </li>
        ))}
      </ul>
      <PlotlyChart data={data} layout={layout} height={height} label={title} />
    </div>
  )
}
