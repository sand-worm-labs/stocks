import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { StrategyManage } from "@/components/Strategy/StrategyManage"
import * as client from "@/lib/strategies/client"

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/strategies/client")

const api = vi.mocked(client)

beforeEach(() => {
  vi.clearAllMocks()
  api.errorMessage.mockImplementation((error) => String(error))
})

const openMenu = () => fireEvent.keyDown(screen.getByRole("button", { name: /^Manage/ }), { key: "Enter" })

describe("managing a strategy", () => {
  it("offers to close one that is trading, and says why it can't be moved to the trash", async () => {
    render(<StrategyManage id="s1" name="Big tech" status="live" stocks={3} value={700} cash={50} />)
    openMenu()

    expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Close strategy…" })).toBeInTheDocument()
    const trash = screen.getByRole("menuitem", { name: /Move to trash/ })
    expect(trash).toHaveAttribute("aria-disabled", "true")
    expect(trash).toHaveTextContent("Close it first: it holds money")
  })

  it("offers the trash, and no close, for a strategy that holds nothing", async () => {
    render(<StrategyManage id="s1" name="Draft" status="draft" />)
    openMenu()

    expect(await screen.findByRole("menuitem", { name: "Move to trash…" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Close strategy…" })).not.toBeInTheDocument()
  })

  it("says what closing does, and does it only when the person confirms", async () => {
    api.closeStrategy.mockResolvedValue({ status: "closed", takenOut: 751.5 })
    render(<StrategyManage id="s1" name="Big tech" status="live" stocks={3} value={700} cash={51.5} />)
    openMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Close strategy…" }))

    expect(await screen.findByText("It holds 3 stocks and cash, about 751.50 USDC in all.")).toBeInTheDocument()
    expect(screen.getByText(/No money can be put in again/)).toBeInTheDocument()
    expect(api.closeStrategy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Sell everything and close" }))
    await waitFor(() => expect(api.closeStrategy).toHaveBeenCalledWith("s1"))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("says what goes to the trash, moves it there only when confirmed, and goes back to the list", async () => {
    api.deleteStrategy.mockResolvedValue({ deletedAt: "2026-11-26T00:00:00Z" })
    render(<StrategyManage id="s1" name="Big tech" status="closed" />)
    openMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to trash…" }))

    expect(await screen.findByText(/It stays there for 30 days/)).toBeInTheDocument()
    expect(screen.getByText(/notebook stays in your Sandworm workspace/)).toBeInTheDocument()
    expect(api.deleteStrategy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Move to trash" }))
    await waitFor(() => expect(api.deleteStrategy).toHaveBeenCalledWith("s1"))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/strategies"))
  })

  it("says what the API refused with, and stays where it is", async () => {
    api.closeStrategy.mockRejectedValue(new Error("This strategy trades from your wallet"))
    const { toast } = await import("sonner")
    render(<StrategyManage id="s1" name="Big tech" status="live" stocks={1} value={10} cash={0} />)
    openMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Close strategy…" }))
    fireEvent.click(await screen.findByRole("button", { name: "Sell everything and close" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't close it", { description: expect.stringContaining("wallet") }))
    expect(refresh).not.toHaveBeenCalled()
  })

  it("renames it with only the name changed", async () => {
    api.renameStrategy.mockResolvedValue({ name: "Steady big tech" })
    render(<StrategyManage id="s1" name="Big tech" status="live" />)
    openMenu()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }))

    const input = await screen.findByRole("textbox", { name: "Strategy name" })
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.change(input, { target: { value: "  Steady   big tech " } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(api.renameStrategy).toHaveBeenCalledWith("s1", "Steady big tech"))
  })
})
