import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SandwormRunBlock } from "@/components/Agent/blocks/SandwormRunBlock"
import type { AgentBlock } from "@/types/agent"

const NOTEBOOK = "https://app.sandwormlab.xyz/workspace/w/documents/d/notebook/edit"
const block = (extra: Partial<Extract<AgentBlock, { type: "sandworm-run" }>> = {}): Extract<AgentBlock, { type: "sandworm-run" }> => ({
  type: "sandworm-run",
  status: "running",
  notebookUrl: NOTEBOOK,
  parts: [],
  ...extra,
})

describe("Sandworm's agent at work, in the strategy's chat", () => {
  it("says it has started, with a way to open the notebook it works in, before it has done anything", () => {
    render(<SandwormRunBlock block={block()} />)
    expect(screen.getByRole("status")).toHaveTextContent("Working in your notebook")
    expect(screen.getByText("Getting started")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open notebook/ })).toHaveAttribute("href", NOTEBOOK)
  })

  it("shows what it does in order: the cells it writes and runs, with their kind, and what it says", () => {
    render(
      <SandwormRunBlock
        block={block({
          parts: [
            { type: "text", text: "Testing the plan." },
            { type: "action", state: "ran", title: "Backtest", blockType: "python" },
            { type: "action", state: "making", title: "Growth chart", blockType: "visualization" },
          ],
        })}
      />
    )

    const items = screen.getAllByRole("listitem").map((item) => item.textContent)
    expect(items).toEqual(["Testing the plan.", "RanBacktestPython", "WritingGrowth chartChart"])
  })

  it("keeps its thinking out of the way until it is opened", () => {
    render(<SandwormRunBlock block={block({ status: "done", parts: [{ type: "thinking", text: "I'll plan the backtest first." }] })} />)

    const toggle = screen.getByRole("button", { name: /Thought/ })
    expect(screen.queryByText("I'll plan the backtest first.")).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByText("I'll plan the backtest first.")).toBeInTheDocument()
  })

  it("says it is thinking only while it is the last thing it did and the run is going", () => {
    const { rerender } = render(<SandwormRunBlock block={block({ parts: [{ type: "thinking", text: "Hm" }] })} />)
    expect(screen.getByRole("button", { name: /Thinking/ })).toBeInTheDocument()

    rerender(<SandwormRunBlock block={block({ status: "done", parts: [{ type: "thinking", text: "Hm" }] })} />)
    expect(screen.getByRole("button", { name: /Thought/ })).toBeInTheDocument()
  })

  it("says what it was asked to put right, and what went wrong", () => {
    render(<SandwormRunBlock block={block({ status: "failed", parts: [{ type: "asked", text: "The notebook isn't done" }, { type: "error", message: "Out of credit" }] })} />)
    expect(screen.getByRole("status")).toHaveTextContent("Stopped")
    expect(screen.getByText(/Stocks asked it to put that right/)).toBeInTheDocument()
    expect(screen.getByText("Out of credit")).toBeInTheDocument()
  })

  it("has no link when there is no notebook yet", () => {
    render(<SandwormRunBlock block={block({ notebookUrl: undefined })} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("says it is the person's own agent at work, not Sandworm's, when an agent from outside tells what it does", () => {
    render(<SandwormRunBlock block={block({ runner: "agent", parts: [{ type: "text", text: "Reading the brief." }] })} />)
    expect(screen.getByRole("region", { name: "Your agent at work" })).toHaveTextContent("Your agent")
    expect(screen.queryByText("Sandworm's agent")).not.toBeInTheDocument()
  })
})
