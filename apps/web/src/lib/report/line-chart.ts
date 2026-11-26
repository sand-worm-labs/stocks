import type { Data, Layout } from "plotly.js-basic-dist-min"

import { REPORT_COLORS } from "./plotly-theme"

export type Line = { name: string; points: { label: string; value: number }[] }
export type LineFormat = "multiple" | "percent" | "currency"

const TICKS = 6

// How a value reads on the axis and in the tooltip
const FORMATS: Record<LineFormat, { axis: Partial<Layout["yaxis"]>; hover: string }> = {
  multiple: { axis: { tickformat: ".1f", ticksuffix: "×" }, hover: "%{y:.2f}×" },
  percent: { axis: { tickformat: ".0f", ticksuffix: "%" }, hover: "%{y:.1f}%" },
  currency: { axis: { tickformat: ",.0f" }, hover: "%{y:,.0f} USDC" },
}

// A handful of evenly spaced dates, ends included: a weekly line has hundreds of labels and a chart that prints them all is unreadable
export function tickLabels(labels: string[], count = TICKS) {
  if (labels.length <= count) return labels
  const step = (labels.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => labels[Math.round(i * step)] ?? "")
}

type LineChartInput = { series: Line[]; format: LineFormat; mark?: { label: string; value: number }; area?: boolean }

// The first line is the strategy's, in the brand colour, and is the only one filled when `area` is on; the others are what it is compared with.
export function lineChart({ series, format, mark, area = false }: LineChartInput): { data: Data[]; layout: Partial<Layout> } {
  const colors = [REPORT_COLORS.strategy, REPORT_COLORS.benchmark, REPORT_COLORS.highlight]
  const { axis, hover } = FORMATS[format]

  const data: Data[] = series.map(({ name, points }, i) => ({
    type: "scatter",
    mode: "lines",
    name,
    x: points.map(({ label }) => label),
    y: points.map(({ value }) => value),
    line: { color: colors[i] ?? REPORT_COLORS.muted, width: 2.4 },
    ...(area && i === 0 ? { fill: "tozeroy" as const, fillcolor: "rgba(238, 20, 158, 0.10)" } : {}),
    hovertemplate: `${hover}<extra>${name}</extra>`,
  }))

  const labels = series[0]?.points.map(({ label }) => label) ?? []

  const layout: Partial<Layout> = {
    hovermode: "x unified",
    xaxis: { type: "category", tickmode: "array", tickvals: tickLabels(labels), tickangle: 0 },
    yaxis: axis,
    ...(mark
      ? {
          shapes: [
            { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: mark.value, y1: mark.value, line: { color: REPORT_COLORS.benchmark, width: 1.4, dash: "dot" } },
          ],
          annotations: [
            {
              xref: "paper",
              x: 1,
              xanchor: "right",
              yref: "y",
              y: mark.value,
              yanchor: "bottom",
              text: mark.label,
              showarrow: false,
              font: { size: 12, color: REPORT_COLORS.benchmark },
            },
          ],
        }
      : {}),
  }

  return { data, layout }
}
