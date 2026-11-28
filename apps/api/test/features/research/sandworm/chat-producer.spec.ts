
import { researchResultSchema } from "@/features/research/research-result"
import type { ChatEvent } from "@/infrastructure/sandworm/sandworm-chat"
import { type ChatClient, createSandwormChatProducer } from "@/features/research/sandworm/chat-producer"
import { RESULT_MARKER } from "@/features/research/sandworm/notebooks"
import type { AgentStep } from "@/features/research/types/agent-step.types"
import type { ResearchChatLog } from "@/features/research/types/research-chat.types"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

const days = (count: number) => Array.from({ length: count }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10))
const rising = (count: number, rate: number) => Array.from({ length: count }, (_, i) => Math.round(100 * (1 + rate) ** i * 100) / 100)
const getPrices = async (tickers: string[]) => ({
  dates: days(400),
  closes: { ...Object.fromEntries(tickers.map((ticker, i) => [ticker, rising(400, 0.0006 + i * 0.0002)])), SPY: rising(400, 0.0002) },
})

const record = {
  id: "r1",
  name: "Robotics",
  brief: "Robotics, I'd panic at -20%",
  budget: 500,
  rules: [
    { type: "max-weight", limit: 0.5 },
    { type: "portfolio-stop", limit: 0.2 },
  ],
  orders: [
    { symbol: "NVDAc", spend: 200, receive: 2, impact: 0 },
    { symbol: "TSLAc", spend: 200, receive: 1, impact: 0 },
  ],
} as unknown as StrategyRecord

const line = (value: unknown) => `${RESULT_MARKER}${JSON.stringify(value)}\n`
const backtest = {
  kind: "backtest", years: 3, from: "2023-11-27", to: "2026-11-24", cagr: 0.2, benchCagr: 0.166, sharpe: 0.8, beta: 0.9, alpha: 0.03,
  recent: { strategy: -0.057, bench: 0.091 }, stops: 2, volatility: 0.31, positiveMonths: 0.62, year: { bad: -0.18, typical: 0.14, good: 0.52 },
}
const growth = { kind: "growth", idx: [0, 399], strategy: [1, 1.1], bench: [1, 1.05] }
const drawdown = { kind: "drawdown", idx: [0, 399], strategy: [0, -3], bench: [0, -1] }
const risk = {
  kind: "risk", maxDrawdown: -0.237, benchMaxDrawdown: -0.19, worstMonth: { label: "2026-11", value: -0.113 }, stops: 2,
  risk: [{ symbol: "NVDA", weight: 0.4, riskShare: 0.6 }, { symbol: "TSLA", weight: 0.4, riskShare: 0.4 }],
}
const everything = line(backtest) + line(growth) + line(drawdown) + line(risk)

const said = (text: string): ChatEvent[] => [{ type: "message_start" }, { type: "text", text }, { type: "action", state: "making", title: "Backtest" }, { type: "action", state: "ran", title: "Backtest" }]

// Sandworm's chat, stood in for: what the notebook has printed at each point, and what the agent streams for each message
function fakeChat(printedAfter: string[], streams: ChatEvent[][] = [said("Testing the plan.\nBuilding the backtest")]) {
  const calls = { cells: [] as { title: string; content: string }[], messages: [] as string[], focused: [] as unknown[], resultsRead: 0 }
  const client: ChatClient = {
    workspaceId: async () => "ws",
    assistantModel: async () => "the-model",
    createNotebook: async (_ws, title) => ({ id: "n1", url: `https://app.sandwormlab.xyz/workspace/ws/documents/n1/notebook/edit#${encodeURIComponent(title)}` }),
    addCells: async (_ws, _id, cells) => {
      calls.cells.push(...cells)
      return cells.map(({ type }, i) => ({ id: `c${i}`, kind: type }))
    },
    startChat: async (_ws, _id, message, _model, focused) => {
      calls.messages.push(message)
      calls.focused.push(focused)
      return { chatId: "chat1", messageId: "m1" }
    },
    sendMessage: async (_chat, content) => {
      calls.messages.push(content)
      return { messageId: `m${calls.messages.length}` }
    },
    streamAnswer: async (_chat, _message, onEvent) => {
      for (const event of streams[Math.min(calls.messages.length - 1, streams.length - 1)] ?? []) onEvent(event)
    },
    results: async () => {
      const text = printedAfter[Math.min(calls.resultsRead++, printedAfter.length - 1)] ?? ""
      return [{ id: "x", state: "success", outputs: [{ type: "stdout", text }] }]
    },
  }
  return { client, calls }
}

describe("the Sandworm chat producer", () => {
  it("opens a notebook with the brief and the prices, asks the chat to do the research, and writes the result from what it printed", async () => {
    const { client, calls } = fakeChat([everything])
    const progress = jest.fn(async (_steps: AgentStep[]) => {})
    const producer = createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client })

    const result = await producer.run!(record, { sandwormToken: "t", progress })

    expect(researchResultSchema.safeParse(result).success).toBe(true)
    expect(result.notebook.title).toBe("Robotics · Research")
    expect(result.metrics).toContainEqual(expect.objectContaining({ label: "Return a year", value: "+20.0%" }))
    // The notebook starts with a summary to fill in, the brief the agent reads, and the real prices
    expect(calls.cells.map(({ title }) => title)).toEqual(["Summary", "Brief", "Prices and plan"])
    expect(calls.cells[1]?.content).toContain("Max 50% in any one stock")
    expect(calls.cells[2]?.content).toContain('DATA = json.loads')
    // One message, which points at the brief cell
    expect(calls.messages).toHaveLength(1)
    expect(calls.focused[0]).toEqual([{ id: "c1", title: "Brief", type: "markdown" }])
  })

  describe("what the person can follow in the strategy's chat", () => {
    const withLog = { ...record, research: { startedAt: "2026-11-26T10:00:00.000Z", mode: "waiting" } } as unknown as StrategyRecord
    const streams: ChatEvent[][] = [
      [
        { type: "message_start" },
        { type: "thinking", text: "Plan the backtest first." },
        { type: "text", text: "Testing the plan." },
        { type: "action", state: "making", title: "Backtest", blockType: "python" },
        { type: "action", state: "ran", title: "Backtest", blockType: "python" },
      ],
    ]
    const run = async (printedAfter: string[], more: ChatEvent[][] = streams) => {
      const { client } = fakeChat(printedAfter, more)
      const logs: ResearchChatLog[] = []
      const chatLog = async (log: ResearchChatLog) => void logs.push(structuredClone(log))
      const producer = createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client, mostFixes: 1 })
      return { logs, outcome: await producer.run!(withLog, { sandwormToken: "t", chatLog }).then(() => "done", (error: Error) => error.message) }
    }

    it("tells it what the agent does as it goes, in order, with the notebook it is working in, and that it is done", async () => {
      const { logs, outcome } = await run([everything])
      expect(outcome).toBe("done")

      expect(new Set(logs.map(({ runStartedAt }) => runStartedAt))).toEqual(new Set(["2026-11-26T10:00:00.000Z"]))
      expect(logs[0]).toMatchObject({ status: "running", parts: [], notebookUrl: expect.stringContaining("/notebook/edit") })
      const last = logs.at(-1)!
      expect(last.status).toBe("done")
      expect(last.parts).toEqual([
        { type: "thinking", text: "Plan the backtest first." },
        { type: "text", text: "Testing the plan." },
        { type: "action", state: "ran", title: "Backtest", blockType: "python" },
      ])
      // It was told while the agent was still working, not only at the end
      expect(logs.filter(({ status }) => status === "running").length).toBeGreaterThan(2)
    })

    it("keeps what it asked the agent to put right, so the person sees why it went on", async () => {
      const { logs } = await run([line(backtest), everything], [[{ type: "text", text: "First go." }], [{ type: "text", text: "Fixed it." }]])
      const last = logs.at(-1)!
      expect(last.status).toBe("done")
      expect(last.parts.map(({ type }) => type)).toEqual(["text", "asked", "text"])
      expect(last.parts[1]).toMatchObject({ type: "asked", text: expect.stringContaining("The notebook isn't done") })
    })

    it("says the run failed when it does, and keeps what the agent did until then", async () => {
      const { logs, outcome } = await run([line(backtest)], [[{ type: "text", text: "Trying." }]])
      expect(outcome).toMatch(/didn't finish/)
      expect(logs.at(-1)).toMatchObject({ status: "failed", parts: [{ type: "text", text: "Trying." }, { type: "asked" }, { type: "text", text: "Trying." }] })
    })

    it("says so when the agent itself stops with an error", async () => {
      const { logs, outcome } = await run([everything], [[{ type: "text", text: "Starting." }, { type: "error", message: "Out of credit" }]])
      expect(outcome).toMatch(/Out of credit/)
      expect(logs.at(-1)).toMatchObject({ status: "failed", parts: [{ type: "text" }, { type: "error", message: "Out of credit" }] })
    })

    it("takes the name the agent chose for the strategy, when it prints one, and asks for it in the brief", async () => {
      const named = everything + line({ kind: "name", name: "  Steady robotics, two names  " })
      const { client, calls } = fakeChat([named])
      const result = await createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(withLog, { sandwormToken: "t" })
      expect(result.name).toBe("Steady robotics, two names")
      expect(calls.cells[1]?.content).toContain('"kind":"name"')
      expect(researchResultSchema.safeParse(result).success).toBe(true)
    })

    it("has no name when the agent printed none, and the research is not held up for it", async () => {
      const { client } = fakeChat([everything])
      const result = await createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(withLog, { sandwormToken: "t" })
      expect(result.name).toBeUndefined()
    })

    it("is not needed: a run with nowhere to tell works as before", async () => {
      const { client } = fakeChat([everything])
      const result = await createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(withLog, { sandwormToken: "t" })
      expect(result.notebook.title).toBe("Robotics · Research")
    })
  })

  it("shows what the agent is doing on the step that is going", async () => {
    const { client } = fakeChat([everything])
    const seen: AgentStep[][] = []
    await createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(record, {
      sandwormToken: "t",
      progress: async (steps) => void seen.push(steps),
    })

    const notes = seen.map((steps) => steps.find(({ state }) => state === "running")?.note).filter(Boolean)
    expect(notes).toContain("Writing “Backtest”")
    expect(notes).toContain("Ran “Backtest”")
    // The notebook is linked from the step as soon as there is one, and the run ends with every step done but the last
    expect(seen.some((steps) => steps.some(({ url }) => url?.includes("/notebook/edit")))).toBe(true)
    expect(seen.at(-1)?.map(({ state }) => state)).toEqual(["done", "done", "done", "done", "running"])
  })

  it("asks the agent to put it right when something wasn't printed, then uses what it printed next", async () => {
    const { client, calls } = fakeChat([line(backtest) + line(growth) + line(drawdown), everything], [said("First try"), said("Fixed it")])
    const result = await createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(record, { sandwormToken: "t" })

    expect(calls.messages).toHaveLength(2)
    expect(calls.messages[1]).toContain('it never printed the "risk" line')
    expect(researchResultSchema.safeParse(result).success).toBe(true)
  })

  it("gives up, and says what was missing, once it has asked as many times as it may", async () => {
    const { client, calls } = fakeChat([line(backtest)])
    const producer = createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client, mostFixes: 1 })
    await expect(producer.run!(record, { sandwormToken: "t" })).rejects.toThrow(/didn't finish.*growth/)
    expect(calls.messages).toHaveLength(2)
  })

  it("stops with the agent's own words when it fails", async () => {
    const { client } = fakeChat([everything], [[{ type: "error", message: "Out of credit" }]])
    await expect(createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(record, { sandwormToken: "t" })).rejects.toThrow("Sandworm's agent stopped: Out of credit")
  })

  it("won't start without the person's Sandworm login", async () => {
    const { client } = fakeChat([everything])
    await expect(createSandwormChatProducer({ baseUrl: "https://x/api", getPrices, client: () => client }).run!(record, {})).rejects.toThrow("signed you out")
  })
})
