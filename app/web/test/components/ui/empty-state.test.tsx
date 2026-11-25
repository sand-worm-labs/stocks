import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EmptyState } from "@/components/ui/empty-state"

describe("EmptyState", () => {
  it("says what is missing and why, and links to what to do first and the way round it", () => {
    render(
      <EmptyState
        icon="holdings"
        title="Nothing here"
        description="Add something."
        primary={{ route: "newPortfolio", label: "Make one" }}
        secondary={{ route: "markets", label: "or look first" }}
      />
    )
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument()
    expect(screen.getByText("Add something.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Make one" })).toHaveAttribute("href", "/strategies/new")
    expect(screen.getByRole("link", { name: "or look first" })).toHaveAttribute("href", "/markets")
  })

  it("shows no buttons when there is nothing to do", () => {
    render(<EmptyState icon="portfolio" title="t" description="d" />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
