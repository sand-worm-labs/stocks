import { SWAP_FEE_RATE } from "@/constants/trade"
import { BENCHMARK, getDailyPrices, shareOf } from "@/lib/research/prices"
import type { ResearchResult } from "@/lib/research/result"
import type { Producer } from "@/lib/strategies/service"
import type { AgentStep } from "@/types/agent"
import type { StrategyRecord } from "@/types/store"

import { createSandwormClient, type RunCell, type SandwormClient, SandwormError } from "./client"
import { type NotebookPlan, researchNotebooks, RESULT_MARKER } from "./notebooks"

// What a trade costs beyond the swap fee: a share of the price lost to moving it
const SLIPPAGE = 0.001
const DEFAULT_PAUSE_DAYS = 63
const DEFAULT_PANIC = 0.2
// How much a year better than the market has to be before it counts as better
const MATERIAL_GAP = 0.01

type Backtest = {
  kind: "backtest"
  years: number
  from: string
  to: string
  cagr: number
  benchCagr: number
  sharpe: number
  beta: number
  alpha: number
  recent: { strategy: number; bench: number }
  stops: number
}

type Risk = {
  kind: "risk"
  maxDrawdown: number
  benchMaxDrawdown: number
  worstMonth: { label: string; value: number }
  stops: number
  risk: { symbol: string; weight: number; riskShare: number }[]
}

// A chart's two lines, as positions in the price dates
type Series = { kind: string; idx: number[]; strategy: number[]; bench: number[] }

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

const percent = (fraction: number, digits = 1) => `${fraction >= 0 ? "+" : "−"}${Math.abs(fraction * 100).toFixed(digits)}%`
const plain = (fraction: number) => `${Math.round(fraction * 100)}%`
const asSeries = (dates: string[], { idx }: Series, values: number[]) => idx.map((at, i) => ({ label: dates[at] ?? "", value: values[i] ?? 0 }))

// Writes what the notebooks found as a result. Every number comes from a notebook's printed line; the sentences are written here, from
// those numbers and from what the person asked for, so each claim can be checked against the notebook it came from.
export function toResult(
  { backtest, risk, growth, drawdown }: { backtest: Backtest; risk: Risk; growth: Series; drawdown: Series },
  {
    links,
    dates,
    panic,
    maxShare,
    prices,
    skipped,
  }: {
    links: { title: string; url: string }[]
    dates: string[]
    panic: number
    maxShare?: number
    prices: string
    skipped: string[]
  }
): ResearchResult {
  const [backtestLink, riskLink] = links
  // A gap under a point a year is noise over three years of prices, so it is called a match and not a win
  const margin = backtest.cagr - backtest.benchCagr
  const ahead = margin >= MATERIAL_GAP
  const matched = Math.abs(margin) < MATERIAL_GAP
  const withinPanic = Math.abs(risk.maxDrawdown) <= panic
  const byRisk = risk.risk.toSorted((a, b) => b.riskShare - a.riskShare)
  const top = byRisk.slice(0, 2)
  const topRisk = top.reduce((sum, { riskShare }) => sum + riskShare, 0)
  const topWeight = top.reduce((sum, { weight }) => sum + weight, 0)

  const verdict: NonNullable<ResearchResult["verdict"]> = !ahead
    ? { tone: matched ? "warn" : "bad", label: matched ? "No clear edge over the S&P 500" : "Behind the S&P 500" }
    : withinPanic && backtest.beta <= 1.3
      ? { tone: "good", label: "Ahead of the S&P 500, within your limit" }
      : { tone: "warn", label: ahead && !withinPanic ? "Ahead, but past your limit" : "Ahead, mostly by taking more market risk" }

  const checks: ResearchResult["checks"] = [
    {
      tone: ahead ? "good" : "warn",
      text: `${ahead ? "Beat" : matched ? "About the same as" : "Behind"} just holding the S&P 500 after costs: ${percent(backtest.cagr)} a year vs ${percent(backtest.benchCagr)}.`,
    },
    {
      tone: backtest.recent.strategy >= backtest.recent.bench ? "good" : "warn",
      text: `Over the last 12 months: ${percent(backtest.recent.strategy, 0)} vs ${percent(backtest.recent.bench, 0)} for the S&P 500.`,
    },
    {
      tone: backtest.beta > 1.3 ? "warn" : "good",
      text: `Beta ${backtest.beta.toFixed(2)}: it moved ${backtest.beta.toFixed(2)}× as much as the market. What it earned beyond that (alpha) is about ${percent(backtest.alpha, 0)} a year.`,
    },
    {
      tone: withinPanic ? "good" : "bad",
      text: `Worst fall from a peak was ${percent(risk.maxDrawdown)}, ${withinPanic ? "inside" : "past"} the −${Math.round(panic * 100)}% you said you'd panic at. The S&P 500's was ${percent(risk.benchMaxDrawdown)}.`,
    },
    {
      tone: topRisk > topWeight + 0.15 ? "warn" : "good",
      text: `${top.map(({ symbol }) => symbol).join(" and ")} carry ${plain(topRisk)} of the risk with ${plain(topWeight)} of the money.`,
    },
    {
      tone: "good",
      text: `The worst single month was ${risk.worstMonth.label} at ${percent(risk.worstMonth.value, 0)}.`,
    },
  ]
  if (risk.stops > 0)
    checks.push({
      tone: "warn",
      text: `The portfolio stop fired ${risk.stops} ${risk.stops === 1 ? "time" : "times"}: everything was sold, and the strategy waited before buying again.`,
    })
  if (skipped.length > 0)
    checks.push({
      tone: "warn",
      text: `${skipped.join(", ")} ${skipped.length === 1 ? "is" : "are"} not listed yet, so there is no price history to test. ${skipped.length === 1 ? "Its" : "Their"} share of the plan was left out of the test and counted as cash, so the real result would differ.`,
    })
  if (maxShare)
    checks.push({ tone: "good", text: `No stock was held above ${plain(maxShare)} of the money when the test started or rebalanced.` })

  return {
    headline: `Over ${backtest.years} years of real prices it made ${percent(backtest.cagr)} a year, with a worst drop of ${percent(risk.maxDrawdown, 0)}`,
    summary: `A backtest of this strategy's plan on daily prices from ${backtest.from} to ${backtest.to}: its weights, looked at again every 21 trading days, ${(SWAP_FEE_RATE + SLIPPAGE) * 100}% paid on every trade, and the portfolio stop. The S&P 500 (SPY) is the comparison. It doesn't model a token drifting from its share, and past results don't predict future ones.`,
    verdict,
    metrics: [
      { label: "Return a year", value: percent(backtest.cagr), note: `S&P 500 ${percent(backtest.benchCagr)}` },
      { label: "Worst drop", value: percent(risk.maxDrawdown), note: `S&P 500 ${percent(risk.benchMaxDrawdown)}` },
      { label: "Sharpe ratio", value: backtest.sharpe.toFixed(2), note: "return per unit of risk" },
      { label: "Beta", value: `${backtest.beta.toFixed(2)}×`, note: "1.00 = moves like the market" },
    ],
    charts: [
      {
        title: "Growth of 1 USDC",
        format: "multiple",
        series: [
          { name: "This strategy", points: asSeries(dates, growth, growth.strategy) },
          { name: "S&P 500", points: asSeries(dates, growth, growth.bench) },
        ],
        notebook: backtestLink?.title,
      },
      {
        title: "Fall from the highest value",
        format: "percent",
        series: [
          { name: "This strategy", points: asSeries(dates, drawdown, drawdown.strategy) },
          { name: "S&P 500", points: asSeries(dates, drawdown, drawdown.bench) },
        ],
        mark: { label: `You'd panic at −${Math.round(panic * 100)}%`, value: -panic * 100 },
        notebook: riskLink?.title,
      },
    ],
    checks,
    holdings: byRisk.map(({ symbol, weight, riskShare }) => ({ symbol, weight, riskShare: Math.max(0, Math.min(1, riskShare)) })),
    steps: [
      { label: "Read the idea" },
      { label: "Get prices" },
      { label: "Backtest", url: backtestLink?.url },
      { label: "Risk check", url: riskLink?.url },
      { label: "Results" },
    ],
    notes: [],
    notebooks: links,
    dataNote: prices,
    isExample: false,
  }
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
export async function inputsFor(record: StrategyRecord, getPrices: typeof getDailyPrices, unlisted: Set<string> = new Set()) {
  const orders = record.orders ?? []
  const budget = orders.reduce((sum, { spend }) => sum + spend, 0)
  if (!orders.length || !budget) throw new SandwormError("This strategy has no stocks to test")

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
  // The symbols of stocks that aren't listed yet
  unlisted?: () => Promise<Set<string>>
  plan?: (inputs: Parameters<typeof researchNotebooks>[0]) => NotebookPlan[]
}

// Does the research on Sandworm, as the person: real prices for the stocks, a backtest notebook and a risk notebook built and run in their
// workspace, and what those printed written up as the result. What goes in the notebooks is `plan`; it is the one thing to swap for
// notebooks that Sandworm's own agent writes, as long as they end by printing their result lines.
export function createSandwormProducer({
  baseUrl,
  client = (token) => createSandwormClient({ baseUrl, token }),
  getPrices = getDailyPrices,
  unlisted = async () => new Set<string>(),
  plan = researchNotebooks,
}: Options): Producer {
  return {
    needsSandworm: true,
    async run(record, { sandwormToken, progress = async () => {} }) {
      if (!sandwormToken) throw new SandwormError("Sandworm has signed you out. Sign in again")
      await progress(progressOf(1))
      const { inputs, panic, maxShare, asOf, skipped } = await inputsFor(record, getPrices, await unlisted())
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
        { links, dates: inputs.dates, panic, maxShare, skipped, prices: `Daily closes from Yahoo Finance, to ${asOf}; the S&P 500 is SPY.` }
      )
    },
  }
}
