// Chart colours. They are CSS values, since a chart library paints with them rather than with classes, and the ones
// that follow the theme read the same tokens the rest of the app does.
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  muted: "var(--ink-300)",
  text: "var(--ink-400)",
  grid: "hsl(var(--border-secondary))",
  positive: "#059669",
  negative: "#dc2626",
  warning: "#d97706",
} as const

export const CHART_ANIMATION = { duration: 1100, easing: "ease-out" } as const
