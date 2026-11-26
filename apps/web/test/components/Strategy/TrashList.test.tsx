import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TrashList } from "@/components/Strategy/TrashList"
import * as client from "@/lib/strategies/client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/strategies/client")

const api = vi.mocked(client)
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const item = (id: string, name: string, days = 20) => ({ id, name, brief: "idea", status: "closed", deletedAt: inDays(-(30 - days)), purgesAt: inDays(days) })

beforeEach(() => {
  vi.clearAllMocks()
  api.errorMessage.mockImplementation((error) => String(error))
})

describe("the trash", () => {
  it("says when it is empty, and what it is for", async () => {
    api.loadTrash.mockResolvedValue([])
    render(<TrashList />)
    expect(await screen.findByText("The trash is empty")).toBeInTheDocument()
    expect(screen.getByText(/waits here for 30 days/)).toBeInTheDocument()
  })

  it("lists what was deleted with how long it has left", async () => {
    api.loadTrash.mockResolvedValue([item("a", "Big tech", 20), item("b", "Robotics", 1)])
    render(<TrashList />)
    expect(await screen.findByText("Big tech")).toBeInTheDocument()
    expect(screen.getByText(/deleted for good in 20 days/)).toBeInTheDocument()
    expect(screen.getByText(/deleted for good in 1 day$/)).toBeInTheDocument()
  })

  it("puts one back, and asks again", async () => {
    api.loadTrash.mockResolvedValueOnce([item("a", "Big tech")]).mockResolvedValue([])
    api.restoreStrategy.mockResolvedValue({ ok: true })
    render(<TrashList />)
    fireEvent.click(await screen.findByRole("button", { name: "Put back" }))

    await waitFor(() => expect(api.restoreStrategy).toHaveBeenCalledWith("a"))
    expect(await screen.findByText("The trash is empty")).toBeInTheDocument()
  })

  it("deletes for good only once the strategy's name is typed, and says it can't be undone", async () => {
    api.loadTrash.mockResolvedValueOnce([item("a", "Big tech")]).mockResolvedValue([])
    api.purgeStrategy.mockResolvedValue({ ok: true })
    render(<TrashList />)
    fireEvent.click(await screen.findByRole("button", { name: "Delete for good…" }))

    expect(await screen.findByText(/can't be undone/)).toBeInTheDocument()
    const confirm = screen.getByRole("button", { name: "Delete for good" })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText("Big tech"), { target: { value: "Big tec" } })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText("Big tech"), { target: { value: "Big tech" } })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    await waitFor(() => expect(api.purgeStrategy).toHaveBeenCalledWith("a", "Big tech"))
  })

  it("says so, and offers to try again, when the trash can't be loaded", async () => {
    api.loadTrash.mockRejectedValueOnce(new Error("down")).mockResolvedValue([])
    render(<TrashList />)
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
    expect(await screen.findByText("The trash is empty")).toBeInTheDocument()
  })
})
