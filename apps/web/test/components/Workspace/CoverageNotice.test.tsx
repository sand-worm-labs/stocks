import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CoverageNotice, CoverageStrip } from "@/components/Workspace/CoverageNotice"
import type { IdeaCoverage } from "@/types/coverage"

const tests = [
  { symbol: "NVDAc", name: "NVIDIA" },
  { symbol: "AAPLc", name: "Apple" },
]

const fallback: IdeaCoverage = {
  basis: "fallback",
  couldntMatch: ["oil", "Exxon"],
  tests,
  cashLeft: 0,
  headline: "Nothing on Base matches oil and Exxon",
  detail: "Those stocks can't be bought here yet, so this would test the 2 most liquid stocks instead: NVDAc and AAPLc.",
}

describe("what the idea asked for that isn't on Base", () => {
  it("says so before the rules are locked, with what would be tested, and a way to change the idea with its words kept", () => {
    render(<CoverageNotice coverage={fallback} brief="Grow 1,000 USDC in oil & gas" />)

    expect(screen.getByRole("heading", { name: "Nothing on Base matches oil and Exxon" })).toBeInTheDocument()
    expect(screen.getByText(/2 most liquid stocks instead/)).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Stocks that would be tested" })).toHaveTextContent("NVDAc")

    const change = screen.getByRole("link", { name: "Change the idea" })
    expect(change.getAttribute("href")).toContain("idea=Grow%201%2C000%20USDC%20in%20oil%20%26%20gas")
    expect(screen.getByText(/confirm the rules to go ahead/)).toBeInTheDocument()
  })

  it("says nothing when everything was found, or while it is still being looked up", () => {
    const { container, rerender } = render(<CoverageNotice coverage={{ basis: "named", couldntMatch: [], tests, cashLeft: 0 }} brief="x" />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CoverageNotice coverage={undefined} brief="x" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("only says part of the money stays in cash when that is all there is to say, with no choice to make", () => {
    const cash: IdeaCoverage = { basis: "named", couldntMatch: [], tests, cashLeft: 0.6, headline: "Part of the money stays in cash", detail: "At 20% a stock, 2 stocks leave 60% of the money in cash." }
    render(<CoverageNotice coverage={cash} brief="x" />)

    expect(screen.getByText(/leave 60% of the money in cash/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Change the idea" })).not.toBeInTheDocument()
  })

  it("keeps the results from being read as a test of what isn't on Base", () => {
    render(<CoverageStrip coverage={fallback} />)
    expect(screen.getByRole("note")).toHaveTextContent("Tested on NVDAc, AAPLc. Not tested: oil, Exxon, which aren't on Base yet.")
  })

  it("has no strip when nothing was left out", () => {
    const { container } = render(<CoverageStrip coverage={{ basis: "named", couldntMatch: [], tests, cashLeft: 0 }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
