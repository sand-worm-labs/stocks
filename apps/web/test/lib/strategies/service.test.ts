// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { reportMockData } from "@/_mockdata/reports"
import { BRIEF, market } from "@/lib/pipeline/fixtures"
import { createLocalPipeline } from "@/lib/pipeline/local"
import type { ResearchResult } from "@/lib/research/result"
import { FileStore } from "@/lib/store/file"

import { toPortfolio } from "@/lib/strategies/portfolio"
import { createStrategyService, fill, RESEARCH_MS, StrategyError, type StrategyService } from "@/lib/strategies/service"

let service: StrategyService
let store: FileStore
let counter = 0
let clock = new Date("2026-11-24T10:00:00.000Z")
const later = (ms: number) => (clock = new Date(clock.getTime() + ms))

beforeEach(async () => {
  clock = new Date("2026-11-24T10:00:00.000Z")
  store = new FileStore(join(await mkdtemp(join(tmpdir(), "strategies-")), "s.json"))
  service = createStrategyService({
    store,
    pipeline: createLocalPipeline(reportMockData[1]),
    market: async () => market,
    now: () => clock,
    random: () => `t${++counter}`,
  })
})

const ready = async (owner = "u1") => {
  const draft = await service.create(owner, BRIEF)
  await service.confirmRules(owner, draft.id)
  return service.finishResearch(owner, draft.id)
}

describe("creating a strategy", () => {
  it("keeps the idea as typed and starts a draft waiting for its rules to be confirmed", async () => {
    const record = await service.create("u1", `  ${BRIEF}  `)
    expect(record).toMatchObject({
      ownerId: "u1",
      brief: BRIEF,
      status: "draft",
      stage: "rules",
      name: "Robotics, capped at 20%",
      budget: 500,
    })
    expect(record.id).toMatch(/^robotics-capped-at-20-t\d+$/)
    expect(record.rules.length).toBeGreaterThan(3)
    expect(await store.get(record.id)).toEqual(record)
  })

  it("refuses an idea that is empty, unreadable, or can't be done, with a reason", async () => {
    await expect(service.create("u1", "   ")).rejects.toMatchObject({ status: 400 })
    await expect(service.create("u1", "asdf qwer zxcv")).rejects.toMatchObject({ status: 422 })
    await expect(service.create("u1", "Turn 100 USDC into 1,000,000 USDC in a week")).rejects.toMatchObject({
      status: 422,
    })
    await expect(service.create("u1", "x".repeat(2001))).rejects.toMatchObject({ status: 400 })
    expect(await store.list("u1")).toEqual([])
  })

  it("is shown to the pages as a draft, in its owner's words", async () => {
    const portfolio = toPortfolio(await service.create("u1", BRIEF))
    expect(portfolio).toMatchObject({ status: "draft", stage: "rules", brief: BRIEF, holdings: [], series: [] })
    expect(portfolio.note).toBeTruthy()
  })
})

describe("renaming", () => {
  it("changes the name, in the record and in the strategy, tidied and kept short", async () => {
    const { id } = await service.create("u1", BRIEF)
    const renamed = await service.rename("u1", id, `   My   robotics ${"x".repeat(80)}`)
    expect(renamed.name.startsWith("My robotics x")).toBe(true)
    expect(renamed.name.length).toBeLessThanOrEqual(60)
    expect(renamed.strategy.name).toBe(renamed.name)
    await expect(service.rename("u1", id, "   ")).rejects.toMatchObject({ status: 400 })
  })
})

describe("the steps, in order", () => {
  it("confirms the rules, researches, then is ready, each once", async () => {
    const draft = await service.create("u1", BRIEF)
    const researching = await service.confirmRules("u1", draft.id)
    expect(researching).toMatchObject({ stage: "researching" })
    expect(researching.report?.preview).toBe(true)
    expect(researching.orders).toHaveLength(4)

    await expect(service.confirmRules("u1", draft.id)).rejects.toMatchObject({ status: 409 })
    expect((await service.finishResearch("u1", draft.id)).stage).toBe("ready")
    expect((await service.finishResearch("u1", draft.id)).stage).toBe("ready")
  })

  it("does not research what has not had its rules confirmed", async () => {
    const draft = await service.create("u1", BRIEF)
    await expect(service.finishResearch("u1", draft.id)).rejects.toMatchObject({ status: 409 })
    await expect(service.goLive("u1", draft.id, 100, { mode: "paper" })).rejects.toMatchObject({ status: 409 })
  })
})

describe("research that runs for a while", () => {
  const started = async () => {
    const draft = await service.create("u1", BRIEF)
    return service.confirmRules("u1", draft.id)
  }

  it("has a start and an end, and says what has happened so far", async () => {
    const draft = await service.create("u1", BRIEF)
    expect(draft.events.map(({ kind }) => kind)).toEqual(["created"])

    const record = await service.confirmRules("u1", draft.id)
    expect(record.research).toEqual({
      startedAt: "2026-11-24T10:00:00.000Z",
      readyAt: new Date(clock.getTime() + RESEARCH_MS).toISOString(),
      mode: "timed",
    })
    expect(record.events.map(({ kind }) => kind)).toEqual(["created", "researching"])
  })

  it("is left as it is until its time is up", async () => {
    const record = await started()
    later(RESEARCH_MS - 1000)
    expect(await service.settle(record)).toEqual(record)
    expect((await store.get(record.id))?.stage).toBe("researching")
  })

  it("finishes by itself once its time is up, and notes it, even though nobody was watching", async () => {
    const record = await started()
    later(RESEARCH_MS)
    const settled = await service.settle(record)
    expect(settled.stage).toBe("ready")
    expect(settled.events.at(-1)).toEqual({ kind: "ready", at: clock.toISOString() })
    const again = await service.settle((await store.get(record.id))!)
    expect(again.events.filter(({ kind }) => kind === "ready")).toHaveLength(1)
  })

  it("leaves a strategy that is not being researched alone", async () => {
    const draft = await service.create("u1", BRIEF)
    later(RESEARCH_MS * 2)
    expect(await service.settle(draft)).toEqual(draft)
  })

  it("can be ended early by the person, noted once", async () => {
    const record = await started()
    const done = await service.finishResearch("u1", record.id)
    expect(done.stage).toBe("ready")
    expect(done.events.filter(({ kind }) => kind === "ready")).toHaveLength(1)
    expect((await service.finishResearch("u1", record.id)).events.filter(({ kind }) => kind === "ready")).toHaveLength(
      1
    )
  })

  it("notes when it goes live", async () => {
    const record = await ready()
    const live = await service.goLive("u1", record.id, 400, { mode: "paper" })
    expect(live.events.map(({ kind }) => kind)).toEqual(["created", "researching", "ready", "live"])
  })
})

describe("trading", () => {
  it("fills the plan: stocks at the plan's prices, the fee on top", () => {
    const { plan, holdings, total, fee } = fill(
      {
        orders: [
          { symbol: "A", spend: 100, receive: 2, impact: 0 },
          { symbol: "B", spend: 100, receive: 4, impact: 0 },
        ],
      },
      100
    )
    expect(plan).toBe(200)
    expect(holdings).toEqual([
      { symbol: "A", units: 1, entryPrice: 50, cost: 50, value: 50 },
      { symbol: "B", units: 2, entryPrice: 25, cost: 50, value: 50 },
    ])
    expect(fee).toBeCloseTo(0.3)
    expect(total).toBeCloseTo(100.3)
  })

  it("goes live with the stocks it bought, and keeps how it was paid for", async () => {
    const record = await ready()
    const live = await service.goLive("u1", record.id, 400, { mode: "paper" })
    expect(live).toMatchObject({ status: "live", cash: 0, startedAt: "2026-11-24T10:00:00.000Z" })
    expect(live.holdings.map(({ symbol }) => symbol)).toEqual(["NVDAc", "AMZNc", "GOOGLc", "TSLAc"])
    expect(live.funding).toMatchObject({ mode: "paper" })
    expect(live.funding?.amount).toBeCloseTo(400 * 1.003)
    expect(toPortfolio(live)).toMatchObject({ status: "live", stage: undefined })
  })

  it("buys less of each when less is spent, but never more than the plan", async () => {
    const record = await ready()
    const live = await service.goLive("u1", record.id, 200, { mode: "paper" })
    expect(live.holdings.every(({ cost }) => cost === 50)).toBe(true)
    const second = await ready()
    await expect(service.goLive("u1", second.id, 401, { mode: "paper" })).rejects.toMatchObject({ status: 400 })
    await expect(service.goLive("u1", second.id, 0.5, { mode: "paper" })).rejects.toMatchObject({ status: 400 })
  })

  it("goes live only once", async () => {
    const record = await ready()
    await service.goLive("u1", record.id, 400, { mode: "paper" })
    await expect(service.goLive("u1", record.id, 400, { mode: "paper" })).rejects.toMatchObject({ status: 409 })
  })

  it("keeps which wallet approved a strategy, and nothing it could be paid from", async () => {
    const record = await ready()
    const live = await service.goLive("u1", record.id, 400, { mode: "live", chainId: 84532, from: "0xabc" })
    expect(live.funding).toMatchObject({ mode: "live", chainId: 84532, from: "0xabc" })
    expect(live.funding).not.toHaveProperty("txHash")
  })
})

describe("whose strategy it is", () => {
  it("is found only by its owner: to anyone else it does not exist", async () => {
    const { id } = await service.create("u1", BRIEF)
    for (const act of [
      () => service.owned("u2", id),
      () => service.rename("u2", id, "Mine now"),
      () => service.confirmRules("u2", id),
      () => service.finishResearch("u2", id),
      () => service.goLive("u2", id, 100, { mode: "paper" }),
    ]) {
      await expect(act()).rejects.toBeInstanceOf(StrategyError)
      await expect(act()).rejects.toMatchObject({ status: 404 })
    }
    expect((await store.get(id))?.name).toBe("Robotics, capped at 20%")
    await expect(service.owned("u1", "nope")).rejects.toMatchObject({ status: 404 })
  })
})

describe("research that is waited on", () => {
  const result: ResearchResult = {
    headline: "Holds up in a test",
    summary: "Example numbers.",
    metrics: [{ label: "Return", value: "+12%" }],
    charts: [{ title: "Value", format: "multiple", series: [{ name: "Strategy", points: [{ label: "Jan", value: 1 }, { label: "Feb", value: 1.1 }] }] }],
    checks: [],
    holdings: [],
    steps: [],
    selection: [],
    sources: [],
    notebook: { title: "Research", url: "https://app.sandwormlab.xyz/workspace/w/documents/d/notebook/edit" },
    notes: [],
    isExample: true,
  }

  const waiting = (run?: () => Promise<ResearchResult>) =>
    createStrategyService({
      store,
      pipeline: createLocalPipeline(reportMockData[1]),
      producer: { run },
      market: async () => market,
      now: () => clock,
      random: () => `w${++counter}`,
    })

  it("is not ended by the clock, only by its result", async () => {
    const agent = waiting()
    const draft = await agent.create("u1", BRIEF)
    const started = await agent.confirmRules("u1", draft.id)
    expect(started.research).toMatchObject({ mode: "waiting" })
    expect(started.research?.readyAt).toBeUndefined()

    later(RESEARCH_MS * 10)
    expect((await agent.settle(started)).stage).toBe("researching")
    expect((await agent.finishResearch("u1", draft.id)).stage).toBe("researching")

    const done = await agent.completeResearch("u1", draft.id, result)
    expect(done.stage).toBe("ready")
    expect(done.research?.result?.headline).toBe("Holds up in a test")
  })

  it("takes a result only from the owner, once, and only a whole one that links to Sandworm", async () => {
    const agent = waiting()
    const { id } = await agent.create("u1", BRIEF)
    await expect(agent.completeResearch("u1", id, result)).rejects.toMatchObject({ status: 409 })
    await agent.confirmRules("u1", id)
    await expect(agent.completeResearch("u2", id, result)).rejects.toMatchObject({ status: 404 })
    await expect(agent.completeResearch("u1", id, { headline: "x" })).rejects.toMatchObject({ status: 422 })
    await expect(
      agent.completeResearch("u1", id, { ...result, notebook: { title: "x", url: "https://evil.example/n" } })
    ).rejects.toMatchObject({ status: 422 })
    await agent.completeResearch("u1", id, result)
    await expect(agent.completeResearch("u1", id, result)).rejects.toMatchObject({ status: 409 })
  })

  it("does its own work when its producer can, and keeps what went wrong on the run", async () => {
    const works = waiting(async () => result)
    const a = await works.create("u1", BRIEF)
    await works.confirmRules("u1", a.id)
    await works.produce("u1", a.id, {})
    expect((await store.get(a.id))?.stage).toBe("ready")

    const fails = waiting(async () => {
      throw new Error("no credit")
    })
    const b = await fails.create("u1", BRIEF)
    await fails.confirmRules("u1", b.id)
    await fails.produce("u1", b.id, {})
    const failed = await store.get(b.id)
    expect(failed?.stage).toBe("researching")
    expect(failed?.research?.error).toMatch(/no credit/)
  })

  it("shows the person why a run stopped, and lets them start it again once", async () => {
    const { ResearchFailure } = await import("@/lib/research/failure")
    let attempts = 0
    const flaky = createStrategyService({
      store,
      pipeline: createLocalPipeline(reportMockData[1]),
      producer: {
        run: async () => {
          if (++attempts === 1) throw new ResearchFailure("No price history for ANT (Yahoo answered 404)")
          return result
        },
      },
      market: async () => market,
      now: () => clock,
      random: () => `f${++counter}`,
    })
    const { id } = await flaky.create("u1", BRIEF)
    await flaky.confirmRules("u1", id)
    await flaky.produce("u1", id, {})

    const stopped = await store.get(id)
    expect(stopped?.research?.error).toBe("The research stopped: No price history for ANT (Yahoo answered 404)")
    await expect(flaky.retryResearch("u1", "nobody")).rejects.toMatchObject({ status: 404 })

    await flaky.retryResearch("u1", id)
    expect((await store.get(id))?.research?.error).toBeUndefined()
    await expect(flaky.retryResearch("u1", id)).rejects.toMatchObject({ status: 409 })
    await flaky.produce("u1", id, {})
    expect((await store.get(id))?.stage).toBe("ready")
  })

  it("keeps what had been done when a run stops", async () => {
    const stops = createStrategyService({
      store,
      pipeline: createLocalPipeline(reportMockData[1]),
      producer: {
        run: async (_record, { progress }) => {
          await progress?.([{ label: "Read the idea", state: "done" }])
          throw new Error("boom")
        },
      },
      market: async () => market,
      now: () => clock,
      random: () => `k${++counter}`,
    })
    const { id } = await stops.create("u1", BRIEF)
    await stops.confirmRules("u1", id)
    await stops.produce("u1", id, {})
    expect((await store.get(id))?.research?.progress).toEqual([{ label: "Read the idea", state: "done" }])
  })

  it("lists what an agent from outside is being waited on for", async () => {
    const agent = waiting()
    const a = await agent.create("u1", BRIEF)
    await agent.create("u1", BRIEF)
    expect(await agent.waitingForResearch("u1")).toEqual([])
    await agent.confirmRules("u1", a.id)
    expect((await agent.waitingForResearch("u1")).map(({ id }) => id)).toEqual([a.id])
    expect(await agent.waitingForResearch("u2")).toEqual([])
  })
})

describe("moving a live strategy's money", () => {
  const prices = async () => ({ NVDAc: 100, TSLAc: 200, AMZNc: 50, GOOGLc: 150, AAPLc: 120, MSFTc: 300 })
  const trading = async () => {
    const money = createStrategyService({
      store,
      pipeline: createLocalPipeline(reportMockData[1]),
      prices,
      market: async () => market,
      now: () => clock,
      random: () => `m${++counter}`,
    })
    const draft = await money.create("u1", BRIEF)
    await money.confirmRules("u1", draft.id)
    await money.finishResearch("u1", draft.id)
    const live = await money.goLive("u1", draft.id, 400, { mode: "paper" })
    return { money, id: draft.id, live }
  }

  it("records what was put in and what it bought, and the strategy holds more and keeps the fee", async () => {
    const { money, id, live } = await trading()
    const before = live.holdings.reduce((sum, { units }) => sum + units, 0)
    later(60_000)
    const { record, lines } = await money.addFunds("u1", id, 100)

    expect(lines[0]).toMatchObject({ kind: "deposit", usdc: 100 })
    expect(lines.slice(1).every(({ kind }) => kind === "buy")).toBe(true)
    expect(record.holdings.reduce((sum, { units }) => sum + units, 0)).toBeGreaterThan(before)
    expect(record.cash).toBeGreaterThanOrEqual(0)
    expect((await store.get(id))?.ledger?.length).toBe(lines.length + live.holdings.length + 1)
  })

  it("sells at today's price, takes the fee off, and puts the money back as cash", async () => {
    const { money, id, live } = await trading()
    const [first] = live.holdings
    const { record, lines } = await money.sell("u1", id, { symbols: [first!.symbol], share: 0.5 })

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ kind: "sell", symbol: first!.symbol })
    expect(record.cash).toBeGreaterThan(0)
    expect(record.holdings.find(({ symbol }) => symbol === first!.symbol)?.units).toBeCloseTo(first!.units / 2, 5)
  })

  it("takes out only cash, and says so when there isn't enough", async () => {
    const { money, id } = await trading()
    await expect(money.removeFunds("u1", id, 50)).rejects.toMatchObject({ status: 400 })
    await money.sell("u1", id, { share: 1 })
    const { record } = await money.removeFunds("u1", id, 10)
    expect(record.holdings).toEqual([])
    expect(record.cash).toBeGreaterThan(0)
  })

  it("moves nothing for a strategy that isn't trading, isn't the person's, or trades from a wallet", async () => {
    const { money, id } = await trading()
    await expect(money.addFunds("u2", id, 10)).rejects.toMatchObject({ status: 404 })

    const draft = await money.create("u1", BRIEF)
    await expect(money.addFunds("u1", draft.id, 10)).rejects.toMatchObject({ status: 409 })

    const wallet = await money.create("u1", BRIEF)
    await money.confirmRules("u1", wallet.id)
    await money.finishResearch("u1", wallet.id)
    await money.goLive("u1", wallet.id, 400, { mode: "live", from: "0xabc", chainId: 84532 })
    await expect(money.sell("u1", wallet.id, { share: 1 })).rejects.toThrow(/wallet/)
  })
})
