import { describe, expect, it } from "vitest"

import type { RouteId } from "@/config/routes"

import { currentTab } from "./navigation"

const desktop: RouteId[] = ["home", "portfolios", "markets", "activity"]
const mobile: RouteId[] = ["home", "portfolios", "newPortfolio", "markets", "activity"]

describe("currentTab", () => {
  it("marks the section a page is in", () => {
    expect(currentTab(desktop, "/")).toBe("home")
    expect(currentTab(desktop, "/markets/NVDAc")).toBe("markets")
    expect(currentTab(desktop, "/portfolios/robotics-20/report")).toBe("portfolios")
  })

  it("puts the new-portfolio flow under New where there is a tab for it, and Portfolios where there isn't", () => {
    expect(currentTab(mobile, "/portfolios/new/brief")).toBe("newPortfolio")
    expect(currentTab(desktop, "/portfolios/new/brief")).toBe("portfolios")
  })

  it("marks nothing for a page outside the tabs", () => {
    expect(currentTab(desktop, "/settings")).toBeUndefined()
  })
})
