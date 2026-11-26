import type { Time, UTCTimestamp } from "lightweight-charts"

import type { ChartEvent } from "@/lib/portfolios/chart"

// The strategy's own line: violet by day, white by night, where violet doesn't read
export const ACCENT = {
  light: { line: "#7F56D9", top: "rgba(127, 86, 217, 0.32)", bottom: "rgba(127, 86, 217, 0)", label: "#7F56D9" },
  dark: { line: "#FFFFFF", top: "rgba(255, 255, 255, 0.22)", bottom: "rgba(255, 255, 255, 0)", label: "#3a3a3a" },
}

export const LINE_COLORS = ["#64748b", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"]
const FIRST_COLOR = LINE_COLORS[0] ?? "#64748b"
// More than three lines is a tangle, so a fourth switched on pushes the oldest off
export const MAX_COMPARED = 3
export const DEFAULT_COMPARED = "SPY"

export const REVEAL_MS = 1100
export const FUND_MS = 520
export const CHIP_MS = 320

export type Slot = { id: string; color: string }

export const withAlpha = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(3)})`
}

export const isoOf = (seconds: Time) => new Date(Number(seconds) * 1000).toISOString()

export type View = "value" | "return"
export const VIEWS = [
  { value: "value", label: "Value" },
  { value: "return", label: "Return" },
] as const

export const plotted = (value: number, base: number, view: View) =>
  view === "return" ? (value / (base || 1) - 1) * 100 : value

export const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(Math.abs(value) < 10 ? 2 : 1)}%`

export const formatSignedPercentPoints = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)} points`

export function formats(view: View, biggest: number) {
  if (view === "return") {
    return { series: { type: "custom" as const, minMove: 0.01, formatter: percent }, axis: percent }
  }
  return {
    series: { type: "price" as const, precision: biggest >= 1000 ? 0 : 2, minMove: biggest >= 1000 ? 1 : 0.01 },
    axis: (price: number) => price.toLocaleString("en-US", { maximumFractionDigits: biggest >= 1000 ? 0 : 2 }),
  }
}

export function risingTimes(times: number[]) {
  let last = 0
  return times.map((time) => (last = Math.max(time, last + 1)) as UTCTimestamp)
}

export function markerTimes(times: UTCTimestamp[], events: ChartEvent[]) {
  return events
    .flatMap(({ time }) => {
      const nearest = times.reduce<UTCTimestamp | undefined>(
        (best, one) => (best === undefined || Math.abs(one - time) < Math.abs(best - time) ? one : best),
        undefined
      )
      return nearest === undefined ? [] : [nearest]
    })
    .sort((a, b) => a - b)
}

export const defaultPicked = (ids: string[]): Slot[] =>
  ids.includes(DEFAULT_COMPARED) ? [{ id: DEFAULT_COMPARED, color: FIRST_COLOR }] : []

export function toggled(picked: Slot[], id: string) {
  let next: Slot[]
  if (picked.some((slot) => slot.id === id)) next = picked.filter((slot) => slot.id !== id)
  else {
    const kept = picked.length >= MAX_COMPARED ? picked.slice(1) : picked
    const color = LINE_COLORS.find((free) => !kept.some((slot) => slot.color === free)) ?? FIRST_COLOR
    next = [...kept, { id, color }]
  }
  return {
    next,
    gone: picked.filter((slot) => !next.some((other) => other.id === slot.id)),
    added: next.filter((slot) => !picked.some((other) => other.id === slot.id)),
  }
}
