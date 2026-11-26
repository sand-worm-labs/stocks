"use client"

import type { Data, Layout } from "plotly.js-basic-dist-min"

import { PlotlyChart } from "@/components/Report/charts/PlotlyChart"
import { REPORT_COLORS } from "@/lib/report/plotly-theme"

type Holding = { symbol: string; weight: number; riskShare: number }

const ROW = 46
const FRAME = 56

// How much of the money, and how much of the risk, each stock carries. A bar longer for risk than for money is the stock moving the result.
export function ShareBars({ holdings }: { holdings: Holding[] }) {
  // Plotly draws a horizontal bar chart from the bottom up, so the biggest holding goes last to be on top
  const rows = holdings.toSorted((a, b) => a.riskShare - b.riskShare)
  const symbols = rows.map(({ symbol }) => symbol)
  const longest = Math.max(...holdings.flatMap(({ weight, riskShare }) => [weight, riskShare]))

  const bars = (name: string, values: number[], color: string): Data => ({
    type: "bar",
    orientation: "h",
    name,
    y: symbols,
    x: values,
    marker: { color },
    texttemplate: "%{x:.0%}",
    textposition: "outside",
    cliponaxis: false,
    textfont: { size: 12.5, color: REPORT_COLORS.ink },
    hovertemplate: `${name}: %{x:.1%}<extra>%{y}</extra>`,
  })

  const layout: Partial<Layout> = {
    barmode: "group",
    bargap: 0.35,
    bargroupgap: 0.08,
    hovermode: "closest",
    margin: { r: 36 },
    xaxis: { visible: false, range: [0, longest * 1.18] },
    yaxis: { showgrid: false, tickfont: { size: 13.5, color: REPORT_COLORS.ink } },
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="text-ink-200 flex gap-5 text-[13px]">
        {[
          ["Money in it", REPORT_COLORS.tint],
          ["Share of the risk", REPORT_COLORS.benchmark],
        ].map(([label, color]) => (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: color }} />
            {label}
          </li>
        ))}
      </ul>
      <PlotlyChart
        height={rows.length * ROW * 1.25 + FRAME}
        label="How much of the money and how much of the risk each stock carries"
        layout={layout}
        data={[
          bars(
            "Money in it",
            rows.map(({ weight }) => weight),
            REPORT_COLORS.tint
          ),
          bars(
            "Share of the risk",
            rows.map(({ riskShare }) => riskShare),
            REPORT_COLORS.benchmark
          ),
        ]}
      />
    </div>
  )
}
