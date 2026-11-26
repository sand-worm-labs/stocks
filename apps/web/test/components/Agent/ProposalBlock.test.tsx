import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AgentContext } from "@/components/Agent/AgentContext"
import { ProposalBlock } from "@/components/Agent/blocks/ProposalBlock"
import type { AgentBlock, ProposalStatus } from "@/types/agent"

const block = (status: ProposalStatus): Extract<AgentBlock, { type: "proposal" }> => ({
  type: "proposal",
  id: "m1",
  title: "Add 50.00 USDC",
  rows: [
    { label: "Amazon", term: "AMZNc", value: "16.50 USDC" },
    { label: "Fees", value: "0.05 USDC" },
  ],
  status,
  confirmLabel: "Add 50.00 USDC",
})

function show(status: ProposalStatus, decide = vi.fn()) {
  render(
    <AgentContext value={{ send: vi.fn(), decide }}>
      <ProposalBlock block={block(status)} />
    </AgentContext>
  )
  return decide
}

describe("a step the agent asks to confirm", () => {
  it("shows what it would do, and confirms or cancels it by its message", () => {
    const decide = show("pending")
    expect(screen.getByText("16.50 USDC")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Add 50.00 USDC" }))
    expect(decide).toHaveBeenCalledWith("m1", "confirm")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(decide).toHaveBeenCalledWith("m1", "cancel")
  })

  it("can't be pressed again while it is being done", () => {
    show("working")
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it.each([
    ["done", "Done"],
    ["cancelled", "Cancelled"],
    ["failed", "Didn't go through"],
  ] as const)("reads as what happened once it is %s, with no button left to press", (status, text) => {
    show(status)
    expect(screen.getByRole("status")).toHaveTextContent(text)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
