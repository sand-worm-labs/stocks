import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

import type { Portfolio } from "@/types/portfolios"

import { ExposureCard } from "./ExposureCard"

const exposure = (n: number) => ({
  portfolio: { id: `strategy-${n}`, name: `Strategy ${n}`, startedAt: "2026-11-10T10:00:00" } as Portfolio,
  value: 100 + n,
  weight: 0.2,
  gain: n,
  gainRate: 0.01,
})

describe("ExposureCard", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("lists the strategies five at a time, with the way to the rest", () => {
    render(<ExposureCard exposures={Array.from({ length: 12 }, (_, i) => exposure(i + 1))} />)

    expect(screen.getAllByRole("link")).toHaveLength(5)
    expect(screen.getByText("1–5 of 12")).toBeTruthy()
    expect(screen.getByText("Strategy 1")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("Next page"))
    expect(screen.getByText("6–10 of 12")).toBeTruthy()
    expect(screen.getByText("Strategy 6")).toBeTruthy()
    expect(screen.queryByText("Strategy 1")).toBeNull()

    fireEvent.click(screen.getByLabelText("Next page"))
    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.getByText("11–12 of 12")).toBeTruthy()
  })

  it("shows no page controls when everything fits on one page", () => {
    render(<ExposureCard exposures={[exposure(1), exposure(2)]} />)

    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.queryByLabelText("Next page")).toBeNull()
  })

  it("says so when the stock is not held", () => {
    render(<ExposureCard exposures={[]} />)

    expect(screen.getByText("You don't hold this stock yet.")).toBeTruthy()
  })
})
