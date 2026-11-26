import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ResearchResultView } from "@/components/Report/ResearchResultView"
import { researchResultSchema } from "@/lib/research/result"

// The charts draw nothing here; the links and numbers of the parts are what is looked at
vi.mock("@/components/Report/Lines", () => ({ Lines: () => null }))
vi.mock("@/components/Report/WhatIf", () => ({ WhatIf: () => null }))

const NOTEBOOK = "https://app.sandwormlab.xyz/workspace/w/documents/d/notebook/edit"
const series = (name: string) => ({ name, points: [{ label: "2024-01", value: 1 }, { label: "2024-02", value: 1.1 }] })

const base = researchResultSchema.parse({
  headline: "Ahead of the market",
  summary: "It beat the S&P 500.",
  metrics: [{ label: "Return a year", value: "+12%" }],
  charts: [
    { title: "Growth of 1 USDC", kind: "growth", series: [series("Strategy"), series("S&P 500")] },
    { title: "Drop from the high", kind: "drop", series: [series("Strategy"), series("S&P 500")] },
  ],
  checks: [{ tone: "good", text: "Inside the limit." }],
  holdings: [{ symbol: "NVDAc", weight: 0.5, riskShare: 0.6 }],
  selection: [{ symbol: "NVDAc", text: "Picked for chips." }],
  notebook: { title: "Research", url: NOTEBOOK },
})

const hrefs = () => screen.getAllByRole("link", { name: /Open in notebook|See how it was worked out/ }).map((link) => link.getAttribute("href"))

describe("a report that is backed by one notebook", () => {
  it("links each part to its own block of the notebook, so the notebook can scroll to it", () => {
    const result = { ...base, blocks: { answer: "b1", growth: "b3", checks: "b4", drawdown: "b5", risk: "b6", stocks: "b8" } }
    render(<ResearchResultView result={result} amount={500} />)

    // Sources has no block here, so it opens the notebook itself
    expect(hrefs()).toEqual([...["b1", "b4", "b3", "b5", "b6", "b8"].map((block) => `${NOTEBOOK}?block=${block}`), NOTEBOOK])
  })

  it("numbers the parts as the notebook does, whichever parts the report shows", () => {
    render(<ResearchResultView result={base} amount={500} />)
    // Growth is part 3 and the drop is part 5 in the notebook, though the report has no part between them
    const growth = screen.getByRole("heading", { name: /Growth of 1 USDC/ })
    const drop = screen.getByRole("heading", { name: /Drop from the high/ })
    expect(growth).toHaveTextContent(/^3/)
    expect(drop).toHaveTextContent(/^5/)
  })

  it("sends a part with no block of its own to the notebook itself", () => {
    render(<ResearchResultView result={base} amount={500} />)
    expect(new Set(hrefs())).toEqual(new Set([NOTEBOOK]))
  })
})
