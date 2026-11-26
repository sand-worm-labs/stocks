import { describe, expect, it } from "vitest"

import { lineChart, tickLabels } from "@/lib/report/line-chart"

const labels = Array.from({ length: 101 }, (_, i) => `d${i}`)

describe("tickLabels", () => {
  it("keeps both ends and spaces the rest evenly", () => {
    expect(tickLabels(labels, 5)).toEqual(["d0", "d25", "d50", "d75", "d100"])
  })

  it("keeps every label when there are few", () => {
    expect(tickLabels(["a", "b", "c"])).toEqual(["a", "b", "c"])
  })
})

describe("lineChart", () => {
  const series = [
    { name: "Strategy", points: labels.map((label, i) => ({ label, value: i })) },
    { name: "S&P 500", points: labels.map((label, i) => ({ label, value: i / 2 })) },
  ]

  it("fills only the strategy's line when asked for an area", () => {
    const { data } = lineChart({ series, format: "percent", area: true })
    expect(data[0]).toMatchObject({ fill: "tozeroy" })
    expect(data[1]).not.toHaveProperty("fill")
  })

  it("draws a marked level as a dotted line with its label", () => {
    const { layout } = lineChart({ series, format: "percent", mark: { label: "You'd panic here", value: -30 } })
    expect(layout.shapes).toHaveLength(1)
    expect(layout.annotations?.[0]).toMatchObject({ text: "You'd panic here", y: -30 })
  })
})
