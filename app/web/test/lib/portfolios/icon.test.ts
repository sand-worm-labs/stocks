import { PiCpu, PiRobot, PiRocketLaunch } from "react-icons/pi"
import { describe, expect, it } from "vitest"

import { DEFAULT_PORTFOLIO_ICON } from "@/constants/portfolio-icons"

import { iconFor } from "@/lib/portfolios/icon"

describe("iconFor", () => {
  it("takes the icon from the theme in the name", () => {
    expect(iconFor("Robotics, capped at 20%")).toBe(PiRobot)
    expect(iconFor("AI chips, max 25%")).toBe(PiCpu)
    expect(iconFor("Space economy")).toBe(PiRocketLaunch)
  })

  it("falls back to the brief, and then to a plain chart", () => {
    expect(iconFor("My first one", "Put USDC into space for 5 years")).toBe(PiRocketLaunch)
    expect(iconFor("Zebra", "nothing in particular")).toBe(DEFAULT_PORTFOLIO_ICON)
  })
})
