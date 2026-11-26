import type { UTCTimestamp } from "lightweight-charts"
import { describe, expect, it } from "vitest"

import {
  DEFAULT_COMPARED,
  defaultPicked,
  formats,
  LINE_COLORS,
  markerTimes,
  MAX_COMPARED,
  percent,
  plotted,
  risingTimes,
  toggled,
  withAlpha,
} from "@/lib/charts/trading"

const at = (...seconds: number[]) => seconds as UTCTimestamp[]

describe("what the chart plots", () => {
  it("plots the value as it is, or how far it has moved from the start, in percent", () => {
    expect(plotted(110, 100, "value")).toBe(110)
    expect(plotted(110, 100, "return")).toBeCloseTo(10)
    expect(plotted(5, 0, "return")).toBe(400)
  })

  it("writes percent with a sign, and fewer places for bigger moves", () => {
    expect(percent(2.345)).toBe("+2.35%")
    expect(percent(-2.345)).toBe("-2.35%")
    expect(percent(12.34)).toBe("+12.3%")
    expect(percent(0)).toBe("0.00%")
  })

  it("writes money to the cent below a thousand, and whole above", () => {
    expect(formats("value", 500).axis(1234.5)).toBe("1,234.5")
    expect(formats("value", 5000).axis(1234.5)).toBe("1,235")
    expect(formats("return", 500).axis(3)).toBe("+3.00%")
  })

  it("turns a colour into a see-through one", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.500)")
  })
})

describe("times the chart will take", () => {
  it("moves points on one second a second apart, so times only go up", () => {
    expect(risingTimes([10, 10, 10, 20])).toEqual([10, 11, 12, 20])
  })

  it("marks the point nearest each event, in order", () => {
    const marks = markerTimes(at(10, 20, 30), [
      { time: 29, label: "b" },
      { time: 11, label: "a" },
    ])
    expect(marks).toEqual([10, 30])
    expect(markerTimes([], [{ time: 1, label: "a" }])).toEqual([])
  })
})

describe("which funds are compared", () => {
  it("starts with the S&P 500 fund when it can be compared", () => {
    expect(defaultPicked([DEFAULT_COMPARED, "QQQ"])).toEqual([{ id: DEFAULT_COMPARED, color: LINE_COLORS[0] }])
    expect(defaultPicked(["QQQ"])).toEqual([])
  })

  it("turns a fund on in the first colour nobody has, and off again", () => {
    const on = toggled([{ id: "SPY", color: LINE_COLORS[0] as string }], "QQQ")
    expect(on.next).toEqual([
      { id: "SPY", color: LINE_COLORS[0] },
      { id: "QQQ", color: LINE_COLORS[1] },
    ])
    expect(on.added).toEqual([{ id: "QQQ", color: LINE_COLORS[1] }])
    const off = toggled(on.next, "SPY")
    expect(off.next.map(({ id }) => id)).toEqual(["QQQ"])
    expect(off.gone.map(({ id }) => id)).toEqual(["SPY"])
  })

  it("pushes the oldest off when one too many is switched on, and gives its colour to the new one", () => {
    const full = LINE_COLORS.slice(0, MAX_COMPARED).map((color, i) => ({ id: `F${i}`, color }))
    const { next, gone, added } = toggled(full, "NEW")
    expect(next).toHaveLength(MAX_COMPARED)
    expect(gone.map(({ id }) => id)).toEqual(["F0"])
    expect(added[0]).toEqual({ id: "NEW", color: LINE_COLORS[0] })
  })
})
