import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAgentThread } from "@/hooks/use-agent-thread"
import * as client from "@/lib/agent/client"
import type { AgentMessage } from "@/types/agent"

vi.mock("@/lib/agent/client")

const say = (id: string, from: AgentMessage["from"], text: string): AgentMessage => ({ id, from, blocks: [{ type: "text", text }] })
const step = (status: "pending" | "done"): AgentMessage => ({
  id: "step",
  from: "agent",
  blocks: [{ type: "proposal", id: "step", title: "Add 50.00 USDC", rows: [], status, confirmLabel: "Add 50.00 USDC" }],
})

const api = vi.mocked(client)

beforeEach(() => {
  vi.resetAllMocks()
  api.loadThread.mockResolvedValue({ messages: [say("m1", "user", "My idea"), say("m2", "agent", "Started")], suggestions: ["How is it doing?"] })
})

describe("the conversation about a strategy", () => {
  it("is loaded for that strategy when the page opens", async () => {
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    expect(result.current.state).toBe("loading")

    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(api.loadThread).toHaveBeenCalledWith("strategy-1")
    expect(result.current.messages.map(({ id }) => id)).toEqual(["m1", "m2"])
    expect(result.current.suggestions).toEqual(["How is it doing?"])
  })

  it("says so when it can't be loaded, and loads when asked to try again", async () => {
    api.loadThread.mockRejectedValueOnce(new Error("down"))
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("failed"))

    await act(() => result.current.retry())
    expect(result.current.state).toBe("ready")
    expect(result.current.messages).toHaveLength(2)
  })

  it("shows what the person says at once, then replaces it with what was kept, with the agent's answer after it", async () => {
    let answer: (value: Awaited<ReturnType<typeof client.sendMessage>>) => void = () => {}
    api.sendMessage.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("ready"))

    act(() => void result.current.send("How is it doing?"))
    expect(result.current.thinking).toBe(true)
    expect(result.current.messages.at(-1)).toMatchObject({ from: "user", blocks: [{ text: "How is it doing?" }] })

    await act(async () => answer({ messages: [say("k1", "user", "How is it doing?"), say("k2", "agent", "Worth 100")], superseded: [] }))
    expect(result.current.thinking).toBe(false)
    expect(result.current.messages.map(({ id }) => id)).toEqual(["m1", "m2", "k1", "k2"])
    expect(api.sendMessage).toHaveBeenCalledWith("strategy-1", "How is it doing?")
  })

  it("tells the person when the agent could not answer, and keeps what they said", async () => {
    api.sendMessage.mockRejectedValue(new Error("It broke"))
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("ready"))

    await act(() => result.current.send("Add 50"))
    const texts = result.current.messages.flatMap(({ blocks }) => blocks.flatMap((block) => (block.type === "text" ? [block.text] : [])))
    expect(texts).toEqual(expect.arrayContaining(["Add 50", expect.stringContaining("I couldn't answer that. It broke")]))
    expect(result.current.thinking).toBe(false)
  })

  it("takes a step the agent had waiting off the table when it proposes a new one", async () => {
    api.loadThread.mockResolvedValue({ messages: [step("pending")], suggestions: [] })
    api.sendMessage.mockResolvedValue({ messages: [say("k1", "user", "sell"), say("k2", "agent", "ok")], superseded: ["step"] })
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("ready"))

    await act(() => result.current.send("sell"))
    expect(result.current.messages[0]?.blocks[0]).toMatchObject({ status: "cancelled" })
  })

  it("shows a step as working while it is confirmed, then as the API says it is", async () => {
    api.loadThread.mockResolvedValue({ messages: [step("pending")], suggestions: [] })
    let confirmed: (value: Awaited<ReturnType<typeof client.decideStep>>) => void = () => {}
    api.decideStep.mockReturnValue(new Promise((resolve) => (confirmed = resolve)))
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("ready"))

    act(() => void result.current.decide("step", "confirm"))
    expect(result.current.messages[0]?.blocks[0]).toMatchObject({ status: "working" })

    await act(async () => confirmed({ messages: [step("done"), say("k1", "agent", "Added 50.00 USDC")] }))
    expect(api.decideStep).toHaveBeenCalledWith("strategy-1", "step", "confirm")
    expect(result.current.messages.map(({ id }) => id)).toEqual(["step", "k1"])
    expect(result.current.messages[0]?.blocks[0]).toMatchObject({ status: "done" })
  })

  it("shows a step as failed, and says why, when the confirm can't be made", async () => {
    api.loadThread.mockResolvedValue({ messages: [step("pending")], suggestions: [] })
    api.decideStep.mockRejectedValue(new Error("Offline"))
    const { result } = renderHook(() => useAgentThread("strategy-1"))
    await waitFor(() => expect(result.current.state).toBe("ready"))

    await act(() => result.current.decide("step", "confirm"))
    expect(result.current.messages[0]?.blocks[0]).toMatchObject({ status: "failed" })
    expect(result.current.messages.at(-1)).toMatchObject({ from: "agent", blocks: [{ text: "Offline" }] })
  })

  describe("while Sandworm's agent is at work", () => {
    const run = (status: "running" | "done"): AgentMessage => ({
      id: "run",
      from: "agent",
      blocks: [{ type: "sandworm-run", status, notebookUrl: "https://app.sandwormlab.xyz/n", parts: [{ type: "text", text: status === "done" ? "Finished" : "Working" }] }],
    })

    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    it("looks at the conversation again every few seconds, so what the agent does shows as it happens, and stops when it is done", async () => {
      api.loadThread.mockResolvedValue({ messages: [run("running")], suggestions: [] })
      const { result } = renderHook(() => useAgentThread("strategy-1"))
      await waitFor(() => expect(result.current.state).toBe("ready"))
      const first = api.loadThread.mock.calls.length

      api.loadThread.mockResolvedValue({ messages: [run("done")], suggestions: [] })
      await act(async () => void (await vi.advanceTimersByTimeAsync(3100)))
      expect(api.loadThread.mock.calls.length).toBeGreaterThan(first)
      await waitFor(() => expect(result.current.messages[0]?.blocks[0]).toMatchObject({ status: "done", parts: [{ text: "Finished" }] }))

      const settled = api.loadThread.mock.calls.length
      await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)))
      expect(api.loadThread.mock.calls.length).toBe(settled)
    })

    it("does not look again when nothing is at work", async () => {
      api.loadThread.mockResolvedValue({ messages: [run("done")], suggestions: [] })
      const { result } = renderHook(() => useAgentThread("strategy-1"))
      await waitFor(() => expect(result.current.state).toBe("ready"))
      const calls = api.loadThread.mock.calls.length

      await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)))
      expect(api.loadThread.mock.calls.length).toBe(calls)
    })
  })
})
