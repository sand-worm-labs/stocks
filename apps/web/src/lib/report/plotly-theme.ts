import type { Config, Layout } from "plotly.js-basic-dist-min"

// The look of a Sandworm notebook chart, so a report's charts read the same as the ones in the notebooks they come from. The colours are the
// tokens of sandworm_theme (apps/jupyter/sandworm_theme/tokens.py); keep the two in step. A report is always drawn on white, so there is no
// dark set.
//
// The four pinks are used by lightness, so two that sit side by side are never close: strategy is the primary, benchmark (and anything to watch,
// such as the loss level or the share of risk) is the deepest, tint is the quiet one, highlight is a third line when there is one.
export const REPORT_COLORS = {
  ink: "#17101C",
  muted: "#6F6478",
  rule: "#E9E2ED",
  strategy: "#EE149E",
  benchmark: "#84185C",
  highlight: "#FB51BD",
  tint: "#FE83D1",
} as const

// "inherit" so the chart is set in the report's own typeface (Bricolage Grotesque) instead of Plotly's default
const FONT_FAMILY = "inherit"

const TICK_FONT = { family: FONT_FAMILY, size: 12.5, color: REPORT_COLORS.muted }

export const REPORT_CONFIG: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
}

export function reportLayout(height: number): Partial<Layout> {
  return {
    height,
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: FONT_FAMILY, size: 13, color: REPORT_COLORS.ink },
    margin: { l: 8, r: 8, t: 8, b: 32 },
    showlegend: false,
    // No zooming or panning: the page scrolls, and a chart that grabs a finger on the way past is worse than one that is only read
    dragmode: false,
    xaxis: {
      showgrid: false,
      zeroline: false,
      showline: true,
      linecolor: REPORT_COLORS.rule,
      ticks: "outside",
      tickcolor: REPORT_COLORS.rule,
      tickfont: TICK_FONT,
      fixedrange: true,
    },
    yaxis: {
      showgrid: true,
      gridcolor: REPORT_COLORS.rule,
      zeroline: false,
      showline: false,
      ticks: "",
      tickfont: TICK_FONT,
      fixedrange: true,
      automargin: true,
    },
    hoverlabel: {
      bgcolor: REPORT_COLORS.ink,
      bordercolor: REPORT_COLORS.ink,
      font: { family: FONT_FAMILY, size: 13, color: "#FFFFFF" },
    },
  }
}
