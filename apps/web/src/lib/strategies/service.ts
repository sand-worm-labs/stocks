import { MIN_BUY_AMOUNT, SWAP_FEE_RATE } from "@/constants/trade"
import { analyzeBrief } from "@/lib/brief/analyze"
import { splitDeposit } from "@/lib/portfolios/deposit"
import { ResearchFailure } from "@/lib/research/failure"
import { isSandwormLink, type ResearchResult, researchResultSchema } from "@/lib/research/result"
import type { RuleSpec } from "@/lib/rules/spec"
import { withFee } from "@/lib/trade/fee"
import { depositLines, LedgerError, ledgerOf, positionsOf, saleLines, withdrawLine, withLines } from "@/lib/trade/ledger"
import type { AgentStep } from "@/types/agent"
import type { Market, Pipeline } from "@/types/pipeline"
import type { Holding } from "@/types/portfolios"
import type { Funding, StrategyEvent, StrategyRecord, StrategyStore } from "@/types/store"
import { toPortfolio } from "./portfolio"
import { repeatedKinds, withRules } from "./rules-edit"

export const NAME_MAX_LENGTH = 60
export const RESEARCH_MS = 45_000
export const BRIEF_MAX_LENGTH = 2000

// What went wrong, with the HTTP status the API answers with. The message is safe to show the person.
export class StrategyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 404 | 409 | 422
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

// What a real research run is given about the person who started it. The token is theirs on Sandworm, so the work is done as them and in
// their workspace; it is never stored.
export type ProduceContext = {
  sandwormToken?: string
  // An agent from outside is doing the research itself and will hand it back, so there is no Sandworm login of the person's to need
  submittedByAgent?: boolean
  // Told by the producer as it goes, so the person can watch the run and open each notebook when it exists
  progress?: (steps: AgentStep[]) => Promise<void>
}

// Whoever does the research. With a producer the run is "waiting": it ends when a result comes in. A producer that can `run` does the work
// from here (Sandworm's agent, started after the request is answered); one that can't is waited on, and an agent from outside reports with
// `completeResearch`. Without a producer the stand-in's timed run is used.
export type Producer = {
  // True when the work is done as the person on Sandworm, so it can't start without their login there
  needsSandworm?: boolean
  run?: (record: StrategyRecord, context: ProduceContext) => Promise<ResearchResult>
}

type Dependencies = {
  store: StrategyStore
  pipeline: Pipeline
  producer?: Producer
  // Today's price of each stock, by symbol. Money is moved at these, not at what the browser shows.
  prices?: () => Promise<Record<string, number>>
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
  producer,
  prices = async () => ({}),
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

  const happened = (record: StrategyRecord, kind: StrategyEvent["kind"]) => [
    ...(record.events ?? []),
    { kind, at: now().toISOString() },
  ]

  // Research that has run its time is done: the strategy is ready, and that is noted for its activity and notifications. This is the one
  // place a run ends. The stand-in's ends when its time is up, found out whenever the strategy is next looked at; Sandworm's will end it
  // when it reports back, by calling this.
  const finish = (record: StrategyRecord) => save({ ...record, stage: "ready", events: happened(record, "ready") })

  const isResearching = (record: StrategyRecord) => record.status === "draft" && record.stage === "researching"

  // The one place a real run ends well. A result is checked in full here, whoever it comes from, and only taken while the strategy is
  // being researched, so it can't replace the findings of one that is ready or trading.
  async function completeResearch(ownerId: string, id: string, result: unknown) {
    const record = await owned(ownerId, id)
    if (!isResearching(record) || record.research?.mode !== "waiting")
      throw new StrategyError("It isn't waiting for research", 409)
    const parsed = researchResultSchema.safeParse(result)
    if (!parsed.success) throw new StrategyError("The research result is missing something or has something wrong in it", 422)
    if (!isSandwormLink(parsed.data.notebook.url)) throw new StrategyError("The notebook link has to lead to Sandworm", 422)
    return finish({ ...record, research: { ...record.research, result: parsed.data, error: undefined } })
  }

  // A live strategy that trades on paper, whose money this app can move. One that trades from a wallet has trades signed on the chain,
  // which come later, so nothing is recorded for it here.
  async function paperStrategy(ownerId: string, id: string) {
    const record = await owned(ownerId, id)
    if (record.status !== "live") throw new StrategyError("It isn't trading yet", 409)
    if (record.funding?.mode !== "paper")
      throw new StrategyError("This strategy trades from your wallet, and trades from it aren't available yet", 409)
    return record
  }

  // Applies a change to the ledger, turning what's wrong with it into something to tell the person
  async function moveMoney(record: StrategyRecord, lines: (priceOf: (symbol: string) => number | undefined) => ReturnType<typeof saleLines>) {
    const quotes = await prices()
    const held = new Map(record.holdings.map(({ symbol, entryPrice }) => [symbol, entryPrice]))
    // Today's price, or what was paid when there is no price to be had, so a stock that has dropped out of the feed can still be sold
    const priceOf = (symbol: string) => quotes[symbol] ?? held.get(symbol)
    try {
      const next = withLines(record, lines(priceOf))
      return { saved: await save(next), lines: next.ledger!.slice(ledgerOf(record).length) }
    } catch (error) {
      if (error instanceof LedgerError) throw new StrategyError(error.message, 400)
      throw error
    }
  }

  // Research that has run its time is finished as it is read
  const settle = async (record: StrategyRecord) => {
    const due = record.research?.readyAt && Date.parse(record.research.readyAt) <= now().getTime()
    return isResearching(record) && record.report && due ? finish(record) : record
  }

  const capOf = ({ rules }: StrategyRecord) => rules.find((rule) => rule.type === "max-weight")?.limit ?? 1

  return {
    owned,
    completeResearch,

    // Money put in, and bought into stocks that have room under the rules' cap. What can't be placed stays as cash.
    async addFunds(ownerId: string, id: string, amount: number) {
      const record = await paperStrategy(ownerId, id)
      const quotes = await prices()
      const current = ledgerOf(record)
      const { holdings } = positionsOf(current)
      // Worth what the stocks are worth now, which is what the cap is measured against
      const valued = toPortfolio({
        ...record,
        holdings: holdings.map((holding) => ({ ...holding, value: holding.units * (quotes[holding.symbol] ?? holding.entryPrice) })),
        cash: positionsOf(current).cash,
      })
      const { buys } = splitDeposit(valued, amount, capOf(record))
      const { saved, lines } = await moveMoney(record, (priceOf) => depositLines(record, amount, buys, priceOf, now().toISOString()))
      return { record: saved, lines }
    },

    async removeFunds(ownerId: string, id: string, amount: number) {
      const record = await paperStrategy(ownerId, id)
      const { saved, lines } = await moveMoney(record, () => [withdrawLine(record, amount, now().toISOString())])
      return { record: saved, lines }
    },

    // A share of one stock, or of all of them when none is named, sold at today's price
    async sell(ownerId: string, id: string, { symbols, share }: { symbols?: string[]; share: number }) {
      const record = await paperStrategy(ownerId, id)
      const held = positionsOf(ledgerOf(record)).holdings.map(({ symbol }) => symbol)
      const chosen = symbols?.length ? symbols : held
      const { saved, lines } = await moveMoney(record, (priceOf) => saleLines(record, chosen, share, priceOf, now().toISOString()))
      return { record: saved, lines }
    },

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

    // New rules for a strategy still being looked over. Once they are confirmed the research is done on them, so they stay as they were.
    async editRules(ownerId: string, id: string, rules: RuleSpec[]) {
      const record = await owned(ownerId, id)
      if (record.status !== "draft" || record.stage !== "rules")
        throw new StrategyError("Its rules are confirmed and the research was done on them. Make a new strategy to try other rules", 409)
      const repeated = repeatedKinds(rules)
      if (repeated.length) throw new StrategyError(`A strategy has one ${repeated.join(" and one ")} rule, not several`, 400)
      return save(withRules(record, rules))
    },

    async confirmRules(ownerId: string, id: string, context: ProduceContext = {}) {
      const record = await owned(ownerId, id)
      // Refused before the rules are locked, so signing in again and confirming works, rather than a locked strategy with no research
      if (producer?.needsSandworm && !context.sandwormToken && !context.submittedByAgent)
        throw new StrategyError("Sign out and sign in again to connect your Sandworm account, then confirm", 401)
      if (record.status !== "draft" || record.stage !== "rules")
        throw new StrategyError("Its rules are already confirmed", 409)
      // The stand-in still makes the orders a trade would place; the findings come from the producer when there is one
      const research = await pipeline.research(record, await market())
      const startedAt = now()
      return save({
        ...record,
        stage: "researching",
        report: research.report,
        orders: research.orders,
        research: producer
          ? { startedAt: startedAt.toISOString(), mode: "waiting" }
          : {
              startedAt: startedAt.toISOString(),
              readyAt: new Date(startedAt.getTime() + RESEARCH_MS).toISOString(),
              mode: "timed",
            },
        events: happened(record, "researching"),
      })
    },

    async finishResearch(ownerId: string, id: string) {
      const record = await owned(ownerId, id)
      if (record.stage === "ready") return record
      if (!isResearching(record) || !record.report) throw new StrategyError("It isn't being researched", 409)
      // A real run isn't ended by the clock: it ends when its result comes in, so asking early finds it still going
      if (record.research?.mode === "waiting") return record
      return finish(record)
    },

    // Does a waiting run's work, when its producer can. Run after the request that confirmed the rules has been answered: it takes a while,
    // and what goes wrong is kept on the run for the person to see, never thrown at no one.
    async produce(ownerId: string, id: string, context: ProduceContext) {
      if (!producer?.run) return
      const record = await owned(ownerId, id)
      if (!isResearching(record) || record.research?.mode !== "waiting") return
      const progress = async (steps: AgentStep[]) => {
        const fresh = await owned(ownerId, id)
        if (isResearching(fresh) && fresh.research) await save({ ...fresh, research: { ...fresh.research, progress: steps } })
      }
      try {
        await completeResearch(ownerId, id, await producer.run(record, { ...context, progress }))
      } catch (error) {
        console.error("Research failed", error)
        const fresh = await owned(ownerId, id)
        if (!isResearching(fresh) || !fresh.research) return
        // What is safe to say is said as it is; anything else is said in full only while building the app, where it is what is needed
        const known = error instanceof ResearchFailure || process.env.NODE_ENV !== "production"
        const reason = error instanceof Error && known ? error.message : "Something went wrong on our side"
        await save({ ...fresh, research: { ...fresh.research, error: `The research stopped: ${reason}` } })
      }
    },

    // A run that stopped is started again from the beginning, as the person asked for it. Only one that has failed, so a run that is going
    // can't be doubled.
    async retryResearch(ownerId: string, id: string, context: ProduceContext = {}) {
      const record = await owned(ownerId, id)
      if (producer?.needsSandworm && !context.sandwormToken && !context.submittedByAgent)
        throw new StrategyError("Sign out and sign in again to connect your Sandworm account, then try again", 401)
      if (!isResearching(record) || record.research?.mode !== "waiting" || !record.research.error)
        throw new StrategyError("There is no stopped research to try again", 409)
      return save({ ...record, research: { startedAt: now().toISOString(), mode: "waiting" } })
    },

    // Strategies whose research an agent from outside is being waited on for
    async waitingForResearch(ownerId: string) {
      const records = await store.list(ownerId)
      return records.filter((record) => isResearching(record) && record.research?.mode === "waiting" && !record.research.result)
    },

    settle,

    // Everything this person has made, newest first, each brought up to date
    async list(ownerId: string) {
      return Promise.all((await store.list(ownerId)).map(settle))
    },

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
