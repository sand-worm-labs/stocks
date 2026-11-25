import { describe, expect, it } from "vitest"

import { routeHref } from "@/config/routes"

describe("routeHref", () => {
  it("links a page, with its slug and search", () => {
    expect(routeHref("home")).toBe("/")
    expect(routeHref("stock", { range: "1M" }, "NVDAc")).toBe("/markets/NVDAc?range=1M")
    expect(routeHref("markets", { filter: "held" })).toBe("/markets?filter=held")
  })

  it("links the pages of one portfolio", () => {
    expect(routeHref("portfolio", undefined, "robotics-20")).toBe("/strategies/robotics-20")
    expect(routeHref("report", undefined, "robotics-20")).toBe("/strategies/robotics-20/report")
  })
})
