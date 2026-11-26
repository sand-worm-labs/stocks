"use client"

import dynamic from "next/dynamic"
import type { Config, Data, Layout } from "plotly.js-basic-dist-min"
import type { ComponentType } from "react"

import { REPORT_CONFIG, reportLayout } from "@/lib/report/plotly-theme"

type PlotProps = { data: Data[]; layout: Partial<Layout>; config: Partial<Config>; useResizeHandler: boolean; style: React.CSSProperties }

// Loaded when a chart is first drawn, so the charting code (large) is not part of the page's first load. The basic bundle has the lines, bars
// and areas a report uses and none of the rest.
const Plot = dynamic(
  async () => {
    const [{ default: createPlotlyComponent }, { default: Plotly }] = await Promise.all([
      import("react-plotly.js/factory"),
      import("plotly.js-basic-dist-min"),
    ])
    // The factory is typed against the full Plotly typings and the basic bundle has its own; they describe the same object
    return createPlotlyComponent(Plotly as never) as ComponentType<PlotProps>
  },
  { ssr: false, loading: () => <div aria-hidden="true" className="skeleton h-full w-full rounded-xl" /> }
)

type PlotlyChartProps = {
  data: Data[]
  layout?: Partial<Layout>
  height: number
  // What the chart shows, for anyone who cannot see it
  label: string
}

export function PlotlyChart({ data, layout, height, label }: PlotlyChartProps) {
  const base = reportLayout(height)
  const merged: Partial<Layout> = {
    ...base,
    ...layout,
    xaxis: { ...base.xaxis, ...layout?.xaxis },
    yaxis: { ...base.yaxis, ...layout?.yaxis },
    margin: { ...base.margin, ...layout?.margin },
  }

  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <Plot data={data} layout={merged} config={REPORT_CONFIG} useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
