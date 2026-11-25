import { SWAP_FEE_RATE } from "@/constants/trade"
import { BENCHMARK, getDailyPrices, shareOf } from "@/lib/research/prices"
import { prioritiesOf } from "@/lib/research/report-spec"
import type { Producer } from "@/lib/strategies/service"
import type { AgentStep } from "@/types/agent"
import type { Stock } from "@/types/markets"
import type { StrategyRecord } from "@/types/store"

import { createSandwormClient, type RunCell, type SandwormClient, SandwormError } from "./client"
import { type NotebookPlan, researchNotebooks, RESULT_MARKER } from "./notebooks"
import { type Backtest, type Risk, type Series, SLIPPAGE, toResult } from "./report"

const DEFAULT_PAUSE_DAYS = 63
const DEFAULT_PANIC = 0.2

type Printed = { kind: string } & Record<string, unknown>

// What the notebooks printed after the marker, one object per line that has it
function printed(cells: RunCell[]): Printed[] {
  return cells
    .flatMap(({ outputs = [] }) => outputs)
    .filter(({ type }) => type === "stdout")
    .flatMap(({ text = "" }) => text.split("\n"))
    .filter((line) => line.startsWith(RESULT_MARKER))
    .flatMap((line) => {
      try {
        return [JSON.parse(line.slice(RESULT_MARKER.length)) as Printed]
      } catch {
        return []
      }
    })
}

// What the strategy asked for, read from its rules: how far it may fall before everything is sold, and the most in one stock
export function limitsOf({ rules }: Pick<StrategyRecord, "rules">) {
  const stop = rules.find((rule) => rule.type === "portfolio-stop")
  const max = rules.find((rule) => rule.type === "max-weight")
  return {
    stop: stop?.limit ?? null,
    pause: stop?.pause ?? DEFAULT_PAUSE_DAYS,
    maxShare: max?.limit,
  }
}

// What the notebooks are given for a strategy: the plan's weights, and real prices for the stocks that have them. A stock that isn't listed
// yet (a pre-IPO token) has no share price history, and a ticker that looks like it may be some other company's, so it is left out and said
// so, its share counting as cash.
export async function inputsFor(record: StrategyRecord, getPrices: typeof getDailyPrices, market: Stock[] = []) {
  const orders = record.orders ?? []
  const budget = orders.reduce((sum, { spend }) => sum + spend, 0)
  if (!orders.length || !budget) throw new SandwormError("This strategy has no stocks to test")

  const unlisted = new Set(market.filter(({ preIpo }) => preIpo).map(({ symbol }) => symbol))
  const skipped = orders.filter(({ symbol }) => unlisted.has(symbol)).map(({ symbol }) => symbol)
  const tested = orders.filter(({ symbol }) => !unlisted.has(symbol))
  if (!tested.length) throw new SandwormError("None of this strategy's stocks are listed yet, so there are no prices to test it on")

  const { dates, closes } = await getPrices(tested.map(({ symbol }) => shareOf(symbol)))
  const weights = Object.fromEntries(tested.map(({ symbol, spend }) => [shareOf(symbol), spend / (record.budget || budget)]))
  const { stop, pause, maxShare } = limitsOf(record)
  return {
    inputs: { name: record.name, weights, stop, pause, cost: SWAP_FEE_RATE + SLIPPAGE, dates, closes, benchmark: BENCHMARK },
    panic: stop ?? DEFAULT_PANIC,
    maxShare,
    skipped,
    // What each stock is, and how deep its pool is against what this plan would put into it
    stocks: tested.map(({ symbol, impact }) => {
      const known = market.find((stock) => stock.symbol === symbol)
      return { symbol, name: known?.name, liquidity: known?.liquidity ?? 0, impact }
    }),
    asOf: dates.at(-1) ?? "",
  }
}

const STEPS = ["Read the idea", "Get prices", "Backtest", "Risk check", "Results"] as const

// The run as the person sees it: what is done, what is being done, what is waiting, and each notebook once it is made
function progressOf(done: number, urls: Record<string, string> = {}): AgentStep[] {
  return STEPS.map((label, i) => ({
    label,
    state: i < done ? "done" : i === done ? "running" : "waiting",
    ...(urls[label] && { url: urls[label] }),
  }))
}

type Options = {
  baseUrl: string
  client?: (token: string) => SandwormClient
  getPrices?: typeof getDailyPrices
  // The stocks on offer, which says which aren't listed yet and how deep each pool is
  market?: () => Promise<Stock[]>
  plan?: (inputs: Parameters<typeof researchNotebooks>[0]) => NotebookPlan[]
}

// Does the research on Sandworm, as the person: real prices for the stocks, a backtest notebook and a risk notebook built and run in their
// workspace, and what those printed written up as the result. What goes in the notebooks is `plan`; it is the one thing to swap for
// notebooks that Sandworm's own agent writes, as long as they end by printing their result lines.
export function createSandwormProducer({
  baseUrl,
  client = (token) => createSandwormClient({ baseUrl, token }),
  getPrices = getDailyPrices,
  market = async () => [],
  plan = researchNotebooks,
}: Options): Producer {
  return {
    needsSandworm: true,
    async run(record, { sandwormToken, progress = async () => {} }) {
      if (!sandwormToken) throw new SandwormError("Sandworm has signed you out. Sign in again")
      await progress(progressOf(1))
      const { inputs, panic, maxShare, asOf, skipped, stocks } = await inputsFor(record, getPrices, await market())
      await progress(progressOf(2))
      const sandworm = client(sandwormToken)
      const workspaceId = await sandworm.workspaceId()

      const links: { title: string; url: string }[] = []
      const lines: Printed[] = []
      const urls: Record<string, string> = {}
      for (const { title, cells } of plan(inputs)) {
        const { id, url } = await sandworm.createNotebook(workspaceId, title)
        // Each notebook is linked from its step as soon as it exists, while it is still being filled and run
        urls[STEPS[links.length + 2]!] = url
        await progress(progressOf(links.length + 2, urls))
        const added = await sandworm.addCells(workspaceId, id, cells)
        const runnable = added.filter(({ kind }) => kind === "python").map(({ id: cellId }) => cellId)
        const ran = await sandworm.run(workspaceId, id, runnable)
        const failed = ran.find(({ state }) => state === "error")
        if (failed) throw new SandwormError(`A notebook cell failed: ${failed.error?.slice(0, 200) ?? "no reason given"}`)
        lines.push(...printed(ran))
        links.push({ title: title.split(" · ").at(-1) ?? title, url })
      }
      await progress(progressOf(STEPS.length - 1, urls))

      const backtest = lines.find(({ kind }) => kind === "backtest") as Backtest | undefined
      const risk = lines.find(({ kind }) => kind === "risk") as Risk | undefined
      const growth = lines.find(({ kind }) => kind === "growth") as Series | undefined
      const drawdown = lines.find(({ kind }) => kind === "drawdown") as Series | undefined
      if (!backtest || !risk || !growth || !drawdown) throw new SandwormError("The notebooks didn't print their results")
      return toResult(
        { backtest, risk, growth, drawdown },
        {
          links,
          dates: inputs.dates,
          panic,
          maxShare,
          skipped,
          stocks,
          asOf,
          priorities: prioritiesOf(record.brief, record.rules),
          prices: `Daily closes from Yahoo Finance, to ${asOf}; the S&P 500 is SPY.`,
        }
      )
    },
  }
}
