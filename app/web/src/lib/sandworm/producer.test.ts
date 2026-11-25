// @vitest-environment node
import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"

import { researchResultSchema } from "@/lib/research/result"
import type { StrategyRecord } from "@/types/store"

import { createSandwormClient, type SandwormClient, SandwormError } from "./client"
import { researchNotebooks, RESULT_MARKER } from "./notebooks"
import { createSandwormProducer, inputsFor, limitsOf } from "./producer"

const days = (count: number) => Array.from({ length: count }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10))
// Prices that rise a little each day: the stocks faster than the benchmark
const rising = (count: number, rate: number) => Array.from({ length: count }, (_, i) => Math.round(100 * (1 + rate) ** i * 100) / 100)
const getPrices = async (tickers: string[]) => ({
  dates: days(400),
  closes: { ...Object.fromEntries(tickers.map((ticker, i) => [ticker, rising(400, 0.0006 + i * 0.0002)])), SPY: rising(400, 0.0002) },
})

const record = {
  id: "r1",
  name: "Robotics",
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

// Runs the python of a notebook plan for real, as Sandworm would, and returns the lines it printed
// Sandworm's plotting is stood in for by modules that draw nothing, so the cells that print a chart's series run here too
const STUBS = `
import sys, types
class _Any:
    def __init__(self, *a, **k): pass
    def add_trace(self, *a, **k): pass
plotly = types.ModuleType("plotly"); go = types.ModuleType("plotly.graph_objects")
go.Figure, go.Scatter = _Any, _Any
theme = types.ModuleType("sandworm_theme"); theme.chart = lambda *a, **k: None
sys.modules.update({"plotly": plotly, "plotly.graph_objects": go, "sandworm_theme": theme})
`

function runPython(plan: ReturnType<typeof researchNotebooks>[number]) {
  const code = [STUBS, ...plan.cells.filter(({ type }) => type === "python").map(({ content }) => content)].join("\n")
  return execFileSync("python3", ["-I", "-c", code], { encoding: "utf8" })
    .split("\n")
    .filter((line) => line.startsWith(RESULT_MARKER))
    .map((line) => JSON.parse(line.slice(RESULT_MARKER.length)) as Record<string, unknown> & { kind: string })
}

const hasPython = (() => {
  try {
    execFileSync("python3", ["-V"])
    return true
  } catch {
    return false
  }
})()

describe("what the strategy asks for", () => {
  it("is read from its rules", () => {
    expect(limitsOf(record)).toEqual({ stop: 0.2, pause: 63, maxShare: 0.5 })
    expect(limitsOf({ rules: [] })).toEqual({ stop: null, pause: 63, maxShare: undefined })
  })

  it("gives the notebooks the plan's weights, as the shares the tokens follow, with real prices for them", async () => {
    const { inputs, panic } = await inputsFor(record, getPrices)
    expect(inputs.weights).toEqual({ NVDA: 0.4, TSLA: 0.4 })
    expect(Object.keys(inputs.closes).sort()).toEqual(["NVDA", "SPY", "TSLA"])
    expect(panic).toBe(0.2)
  })

  it("leaves out a stock that isn't listed yet, counting its share as cash, instead of testing it on another company's prices", async () => {
    const withToken = {
      ...record,
      orders: [...(record.orders ?? []), { symbol: "ANTc", spend: 100, receive: 1, impact: 0 }],
    } as StrategyRecord
    const asked: string[][] = []
    const { inputs, skipped } = await inputsFor(
      withToken,
      async (tickers) => (asked.push(tickers), getPrices(tickers)),
      new Set(["ANTc"])
    )
    expect(asked).toEqual([["NVDA", "TSLA"]])
    expect(skipped).toEqual(["ANTc"])
    expect(inputs.weights).toEqual({ NVDA: 0.4, TSLA: 0.4 })
  })

  it("says so on the report, as a caution", async () => {
    const withToken = { ...record, orders: [...(record.orders ?? []), { symbol: "ANTc", spend: 100, receive: 1, impact: 0 }] } as StrategyRecord
    const producer = createSandwormProducer({
      baseUrl: "https://x/api",
      getPrices,
      unlisted: async () => new Set(["ANTc"]),
      client: () => fakeSandworm({ n1: line(backtest) + line(growth), n2: line(risk) + line(drawdown) }),
    })
    const result = await producer.run!(withToken, { sandwormToken: "t" })
    expect(result.checks.find(({ text }) => text.includes("ANTc"))?.text).toMatch(/not listed yet.*counted as cash/)
  })

  it("refuses a strategy with nothing to test", async () => {
    await expect(inputsFor({ ...record, orders: [] } as StrategyRecord, getPrices)).rejects.toBeInstanceOf(SandwormError)
    await expect(inputsFor(record, getPrices, new Set(["NVDAc", "TSLAc"]))).rejects.toThrow(/none of this strategy's stocks are listed/i)
  })
})

describe.skipIf(!hasPython)("the notebooks' own test, run in python", () => {
  it("prints a backtest and a risk result that add up", async () => {
    const { inputs } = await inputsFor(record, getPrices)
    const [backtestPlan, riskPlan] = researchNotebooks(inputs)
    const [backtest, growth] = runPython(backtestPlan!)
    const [risk, drawdown] = runPython(riskPlan!)

    expect(backtest).toMatchObject({ kind: "backtest", stops: 0 })
    // Both stocks rise faster than the benchmark here, so the strategy beats it, and it never falls far from a peak
    expect(backtest!.cagr as number).toBeGreaterThan(backtest!.benchCagr as number)
    expect(backtest!.beta as number).toBeGreaterThan(0)
    expect(growth).toMatchObject({ kind: "growth" })
    expect((growth!.strategy as number[])[0]).toBe(1)
    expect((growth!.idx as number[]).at(-1)).toBe(399)
    expect(drawdown).toMatchObject({ kind: "drawdown" })
    expect(JSON.stringify(growth).length).toBeLessThan(4000)

    expect(risk).toMatchObject({ kind: "risk" })
    expect(risk!.maxDrawdown as number).toBeGreaterThan(-0.01)
    const shares = (risk!.risk as { riskShare: number }[]).map(({ riskShare }) => riskShare)
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 1)
  })

  it("sells everything when the portfolio stop is hit, and waits before buying again", async () => {
    const { inputs } = await inputsFor(record, getPrices)
    // Prices that halve on day 100 and then stay flat
    const crash = Object.fromEntries(Object.entries(inputs.closes).map(([ticker, series]) => [ticker, series.map((price, i) => (i >= 100 && ticker !== "SPY" ? price / 2 : price))]))
    const [, riskPlan] = researchNotebooks({ ...inputs, closes: crash })
    expect(runPython(riskPlan!)[0]).toMatchObject({ kind: "risk", stops: 1 })
  })
})

// A Sandworm that makes notebooks, takes their cells, and "prints" what each notebook is told to
function fakeSandworm(prints: Record<string, string>, ran: string[] = []): SandwormClient {
  let count = 0
  return {
    workspaceId: async () => "ws",
    createNotebook: async (_ws, title) => ({ id: `n${++count}`, url: `https://app.sandwormlab.xyz/workspace/ws/documents/n${count}/notebook/edit#${encodeURIComponent(title)}` }),
    addCells: async (_ws, _id, cells) => cells.map(({ type }, i) => ({ id: `c${count}-${i}`, kind: type })),
    run: async (_ws, id) => {
      ran.push(id)
      return [{ id: "x", state: "success", outputs: [{ type: "stdout", text: prints[id] ?? "" }] }]
    },
  }
}

const line = (value: unknown) => `${RESULT_MARKER}${JSON.stringify(value)}\n`
const backtest = {
  kind: "backtest", years: 3, from: "2023-11-27", to: "2026-11-24", cagr: 0.2, benchCagr: 0.166, sharpe: 0.8, beta: 0.9, alpha: 0.03,
  recent: { strategy: -0.057, bench: 0.091 }, stops: 2,
}
const growth = { kind: "growth", idx: [0, 399], strategy: [1, 1.1], bench: [1, 1.05] }
const drawdown = { kind: "drawdown", idx: [0, 399], strategy: [0, -3], bench: [0, -1] }
const risk = {
  kind: "risk", maxDrawdown: -0.237, benchMaxDrawdown: -0.19, worstMonth: { label: "2026-11", value: -0.113 }, stops: 2,
  risk: [{ symbol: "NVDA", weight: 0.4, riskShare: 0.6 }, { symbol: "TSLA", weight: 0.4, riskShare: 0.4 }],
}

describe("the Sandworm producer", () => {
  it("builds the notebooks, runs only what is python, and writes the result from what they printed", async () => {
    const ran: string[] = []
    const producer = createSandwormProducer({ baseUrl: "https://x/api", getPrices, client: () => fakeSandworm({ n1: line(backtest) + line(growth), n2: line(risk) + line(drawdown) }, ran) })
    const result = await producer.run!(record, { sandwormToken: "t" })

    expect(researchResultSchema.safeParse(result).success).toBe(true)
    expect(ran).toEqual(["n1", "n2"])
    expect(result.isExample).toBe(false)
    expect(result.notebooks.map(({ title }) => title)).toEqual(["Backtest", "Risk"])
    expect(result.steps.find(({ label }) => label === "Backtest")?.url).toBe(result.notebooks[0]?.url)
    expect(result.metrics[0]).toEqual({ label: "Return a year", value: "+20.0%", note: "S&P 500 +16.6%" })
    // The fall past what they'd panic at is said, not hidden
    expect(result.verdict).toEqual({ tone: "warn", label: "Ahead, but past your limit" })
    expect(result.checks.some(({ tone, text }) => tone === "bad" && text.includes("past the −20%"))).toBe(true)
    expect(result.charts[1]?.mark?.value).toBe(-20)
  })

  it("calls a gap too small to matter a match, not a win", async () => {
    const producer = createSandwormProducer({
      baseUrl: "https://x/api",
      getPrices,
      client: () => fakeSandworm({ n1: line({ ...backtest, cagr: 0.168 }) + line(growth), n2: line(risk) + line(drawdown) }),
    })
    const result = await producer.run!(record, { sandwormToken: "t" })
    expect(result.verdict?.label).toBe("No clear edge over the S&P 500")
    expect(result.checks[0]?.text).toMatch(/^About the same as/)
  })

  it("says it is behind when it didn't beat the market", async () => {
    const producer = createSandwormProducer({
      baseUrl: "https://x/api",
      getPrices,
      client: () => fakeSandworm({ n1: line({ ...backtest, cagr: 0.05 }) + line(growth), n2: line(risk) + line(drawdown) }),
    })
    expect((await producer.run!(record, { sandwormToken: "t" })).verdict?.tone).toBe("bad")
  })

  it("fails, rather than make a result with a hole in it, when a notebook printed nothing or a cell failed", async () => {
    const silent = createSandwormProducer({ baseUrl: "https://x/api", getPrices, client: () => fakeSandworm({ n1: line(backtest) }) })
    await expect(silent.run!(record, { sandwormToken: "t" })).rejects.toThrow(/didn't print/)

    const broken: SandwormClient = { ...fakeSandworm({}), run: async () => [{ id: "x", state: "error", error: "NameError: nope" }] }
    const failing = createSandwormProducer({ baseUrl: "https://x/api", getPrices, client: () => broken })
    await expect(failing.run!(record, { sandwormToken: "t" })).rejects.toThrow(/NameError/)
  })

  it("asks them to sign in again when there is no Sandworm token", async () => {
    const producer = createSandwormProducer({ baseUrl: "https://x/api", getPrices })
    await expect(producer.run!(record, {})).rejects.toBeInstanceOf(SandwormError)
  })
})

describe("the Sandworm client", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

  it("works as the person: their token as the cookie, the notebook made, titled, filled and run", async () => {
    const calls: { url: string; cookie: string }[] = []
    const send = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), cookie: (init?.headers as Record<string, string>).Cookie ?? "" })
      if (String(url).endsWith("/graphql")) {
        const { query } = JSON.parse(String(init?.body)) as { query: string }
        return json({ data: query.includes("getUserWorkspaceInfo") ? { getUserWorkspaceInfo: { id: "ws" } } : { createDocument: { id: "doc" } } })
      }
      if (String(url).endsWith("/blocks")) return json({ blocks: [{ id: "c1", kind: "python" }] })
      if (String(url).endsWith("/title")) return json({})
      return json({ status: "finished", cells: [{ id: "c1", state: "success" }] })
    }) as typeof fetch
    const client = createSandwormClient({ baseUrl: "https://api.example.com/api/", token: "secret", fetch: send })

    expect(await client.workspaceId()).toBe("ws")
    const notebook = await client.createNotebook("ws", "Title")
    expect(notebook.url).toMatch(/\/workspace\/ws\/documents\/doc\/notebook\/edit$/)
    await client.addCells("ws", "doc", [{ type: "python", title: "t", content: "print(1)" }])
    expect(await client.run("ws", "doc", ["c1"])).toEqual([{ id: "c1", state: "success" }])

    expect(calls.every(({ cookie }) => cookie === "access_token=secret")).toBe(true)
    expect(calls[0]?.url).toBe("https://api.example.com/api/graphql")
  })

  it("says to sign in again when Sandworm no longer knows the token, and gives up on a run that never ends", async () => {
    const expired = createSandwormClient({ baseUrl: "https://x/api", token: "old", fetch: async () => json({}, 401) })
    await expect(expired.workspaceId()).rejects.toThrow(/Sign in again/)

    const stuck = createSandwormClient({ baseUrl: "https://x/api", token: "t", fetch: async () => json({ status: "running", cells: [] }) })
    await expect(stuck.run("ws", "doc", ["c"], 2)).rejects.toThrow(/too long/)
  })
})
