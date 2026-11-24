import { MIN_BUY_AMOUNT, SWAP_FEE_RATE } from "@/constants/trade"
import { analyzeBrief } from "@/lib/brief/analyze"
import type { Market, Pipeline } from "@/lib/pipeline/types"
import type { Holding } from "@/lib/portfolios/types"
import type { Funding, StrategyEvent, StrategyRecord, StrategyStore } from "@/lib/store/types"
import { withFee } from "@/lib/trade/fee"

export const NAME_MAX_LENGTH = 60
// How long research takes the stand-in agent. Sandworm's takes minutes, so the page is built to be left and come back to.
export const RESEARCH_MS = 45_000
export const BRIEF_MAX_LENGTH = 2000

// What went wrong, with the HTTP status the API answers with. The message is safe to show the person.
export class StrategyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 422
  ) {
    super(message)
  }
}

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH)
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "strategy"

// What buying `amount` of a plan puts in the strategy, and what moves out of the wallet: the stocks at the plan's prices, and the swap
// fee on top. A smaller amount buys the same stocks in the same shares.
export function fill(record: Pick<StrategyRecord, "orders">, amount: number) {
  const orders = record.orders ?? []
  const plan = orders.reduce((sum, { spend }) => sum + spend, 0)
  const scale = plan ? amount / plan : 0
  const holdings: Holding[] = orders.map(({ symbol, spend, receive }) => ({
    symbol,
    units: receive * scale,
    entryPrice: receive ? spend / receive : 0,
    cost: spend * scale,
    value: spend * scale,
  }))
  return { plan, holdings, fee: amount * SWAP_FEE_RATE, total: withFee(amount) }
}

type Dependencies = {
  store: StrategyStore
  pipeline: Pipeline
  // Read when the agent needs to see the market, so the service doesn't fetch it for steps that don't
  market: () => Promise<Market>
  now?: () => Date
  random?: () => string
}

// Making a strategy, from the idea to trading: each step checks that the strategy is the person's own and that it is at the point the
// step belongs to, so a step can't be skipped or done twice, however the API is called. The agent and the store are given, which is how
// this is tested, and how the real agent and a real database replace the stand-ins without it changing.
export function createStrategyService({
  store,
  pipeline,
  market,
  now = () => new Date(),
  random = () => Math.random().toString(36).slice(2, 6),
}: Dependencies) {
  // A strategy that isn't theirs is not found, the same as one that doesn't exist
  async function owned(ownerId: string, id: string) {
    const record = await store.get(id)
    if (!record || record.ownerId !== ownerId) throw new StrategyError("That strategy wasn't found", 404)
    return record
  }

  const save = async (record: StrategyRecord) => {
    const next = { ...record, updatedAt: now().toISOString() }
    await store.save(next)
    return next
  }

  // What has happened, with when
  const happened = (record: StrategyRecord, kind: StrategyEvent["kind"]) => [
    ...(record.events ?? []),
    { kind, at: now().toISOString() },
  ]

  // Research that has run its time is done: the strategy is ready, and that is noted for its activity and notifications. This is the one
  // place a run ends. The stand-in's ends when its time is up, found out whenever the strategy is next looked at; Sandworm's will end it
  // when it reports back, by calling this.
  const finish = (record: StrategyRecord) => save({ ...record, stage: "ready", events: happened(record, "ready") })

  const isResearching = (record: StrategyRecord) => record.status === "draft" && record.stage === "researching"

  return {
    owned,

    // From the idea typed: read it, design it, and keep it as a draft waiting for its rules to be confirmed
    async create(ownerId: string, brief: string) {
      const text = brief.trim()
      if (!text) throw new StrategyError("Write what you want this strategy to do", 400)
      if (text.length > BRIEF_MAX_LENGTH)
        throw new StrategyError(`Keep the idea under ${BRIEF_MAX_LENGTH} characters`, 400)
      const { status, issues } = analyzeBrief(text)
      if (status === "unreadable")
        throw new StrategyError("I couldn't find an investment idea in that. Say what to invest in", 422)
      if (status === "unrealistic") throw new StrategyError(issues[0]?.message ?? "That can't be done as written", 422)

      const design = await pipeline.design(text, await market())
      const stamp = now().toISOString()
      return save({
        id: `${slug(design.name)}-${random()}`,
        ownerId,
        brief: text,
        status: "draft",
        stage: "rules",
        holdings: [],
        cash: 0,
        events: [{ kind: "created", at: stamp }],
        createdAt: stamp,
        updatedAt: stamp,
        ...design,
      })
    },

    async rename(ownerId: string, id: string, name: string) {
      const record = await owned(ownerId, id)
      const next = cleanName(name)
      if (!next) throw new StrategyError("Give the strategy a name", 400)
      return save({ ...record, name: next, strategy: { ...record.strategy, name: next } })
    },

    // The rules are locked and the research starts. The agent's answer is kept now; `finishResearch` is when it is shown.
    async confirmRules(ownerId: string, id: string) {
      const record = await owned(ownerId, id)
      if (record.status !== "draft" || record.stage !== "rules")
        throw new StrategyError("Its rules are already confirmed", 409)
      const research = await pipeline.research(record, await market())
      const startedAt = now()
      return save({
        ...record,
        stage: "researching",
        report: research.report,
        orders: research.orders,
        research: {
          startedAt: startedAt.toISOString(),
          readyAt: new Date(startedAt.getTime() + RESEARCH_MS).toISOString(),
        },
        events: happened(record, "researching"),
      })
    },

    // Ends the research now, rather than when its time is up: for the person who would rather not wait for the stand-in
    async finishResearch(ownerId: string, id: string) {
      const record = await owned(ownerId, id)
      if (record.stage === "ready") return record
      if (!isResearching(record) || !record.report) throw new StrategyError("It isn't being researched", 409)
      return finish(record)
    },

    // A strategy as it is now: research that has run its time is finished first
    async settle(record: StrategyRecord) {
      const due = record.research?.readyAt && Date.parse(record.research.readyAt) <= now().getTime()
      return isResearching(record) && record.report && due ? finish(record) : record
    },

    // Trading begins, once whatever pays for it has been checked by the caller. `funding.amount` is what left the wallet.
    async goLive(ownerId: string, id: string, spend: number, funding: Omit<Funding, "amount">) {
      const record = await owned(ownerId, id)
      if (record.status !== "draft" || record.stage !== "ready") throw new StrategyError("It isn't ready to trade", 409)
      const { plan, holdings, total } = fill(record, spend)
      if (spend < MIN_BUY_AMOUNT || spend > plan + 0.005)
        throw new StrategyError("That amount is outside what the plan can spend", 400)

      return save({
        ...record,
        status: "live",
        holdings,
        cash: 0,
        funding: { ...funding, amount: total },
        events: happened(record, "live"),
        startedAt: now().toISOString(),
      })
    },
  }
}

export type StrategyService = ReturnType<typeof createStrategyService>
