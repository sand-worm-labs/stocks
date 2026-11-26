import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ResearchWaiting } from "@/components/Workspace/ResearchWaiting"

vi.mock("@/lib/strategies/client", () => ({
  finishResearch: vi.fn().mockResolvedValue({ stage: "researching" }),
  retryResearch: vi.fn(),
  errorMessage: (error: unknown) => String(error),
}))

const show = (props: Partial<Parameters<typeof ResearchWaiting>[0]> = {}) =>
  render(<ResearchWaiting id="s1" running runner="sandworm" onDone={vi.fn()} {...props} />)

describe("the card for research that is waited on", () => {
  it("says Sandworm is researching while its own agent does it", () => {
    show()
    expect(screen.getByRole("heading", { name: "Sandworm is researching" })).toBeInTheDocument()
  })

  it("says it is waiting for an agent, and how to ask it, when an agent from outside is to do the research", () => {
    show({ runner: "agent" })
    expect(screen.getByRole("heading", { name: "Waiting for your agent" })).toBeInTheDocument()
    expect(screen.getByText(/Stocks MCP/)).toBeInTheDocument()
    expect(screen.queryByText("Sandworm is researching")).not.toBeInTheDocument()
  })

  it("says the research is finished once it is, and no longer that Sandworm is researching", () => {
    show({ running: false, progress: [{ label: "Results", state: "done", url: "https://app.sandwormlab.xyz/n" }] })
    expect(screen.getByRole("heading", { name: "Research finished" })).toBeInTheDocument()
    expect(screen.queryByText("Sandworm is researching")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /notebook/ })).toHaveAttribute("href", "https://app.sandwormlab.xyz/n")
  })

  it("says why it stopped, and offers to try again when Sandworm was doing it", () => {
    show({ failure: "The research was interrupted when the server restarted. Try again." })
    expect(screen.getByRole("heading", { name: "The research stopped" })).toBeInTheDocument()
    expect(screen.getByText(/interrupted when the server restarted/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("has no try again for an agent's run: it is the agent that is asked", () => {
    show({ runner: "agent", failure: "Something went wrong" })
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
  })
})
