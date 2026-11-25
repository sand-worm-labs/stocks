import { describe, expect, it } from "vitest"

import { auroraAt } from "@/lib/onboarding/aurora"

describe("auroraAt", () => {
  it("is clear in the core of each ellipse, at the top and at the bottom, on the light page", () => {
    expect(auroraAt(0.5, 0, 0)[3]).toBeLessThan(0.02)
    expect(auroraAt(0.5, 1, 0)[3]).toBeLessThan(0.02)
  })

  it("is dark in the cores on the dark page, as in the main app", () => {
    const [r, g, b, a] = auroraAt(0.5, 1, 0, true)
    expect(a).toBeCloseTo(1)
    expect(Math.max(r, g, b)).toBeLessThan(40)
  })

  it("is a paler glow in the middle, where only the glows of both ellipses are left, between violet bands", () => {
    const [, glowGreen] = auroraAt(0.5, 0.36, 0, true)
    for (const y of [0.2, 0.52]) {
      const [, green, blue] = auroraAt(0.5, y, 0, true)
      expect(blue).toBeGreaterThan(green)
      expect(glowGreen).toBeGreaterThan(green)
    }
  })

  it("shows the navy at the sides, between the two ellipses", () => {
    const [r, , b] = auroraAt(0, 0.36, 0, true)
    expect(b).toBeGreaterThan(r)
  })

  it("moves with time, and stays inside what a colour can be", () => {
    expect(auroraAt(0.5, 0.35, 5)).not.toEqual(auroraAt(0.5, 0.35, 0))
    for (const dark of [false, true]) {
      for (const [x, y, t] of [
        [0.5, 0.3, 0],
        [0.1, 0.5, 7.3],
        [0.9, 0.9, 120],
        [0.5, 0.4, 3],
      ] as const) {
        const [r, g, b, a] = auroraAt(x, y, t, dark)
        for (const channel of [r, g, b]) {
          expect(channel).toBeGreaterThanOrEqual(0)
          expect(channel).toBeLessThanOrEqual(255)
        }
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThanOrEqual(1)
      }
    }
  })
})
