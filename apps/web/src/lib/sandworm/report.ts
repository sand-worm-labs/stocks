import { SWAP_FEE_RATE } from "@/constants/trade"
import { shareOf } from "@/lib/research/prices"
import { type KpiId, type Priority, rankKpis } from "@/lib/research/report-spec"
import type { ResearchResult } from "@/lib/research/result"

// What the notebooks print. Each is a line of numbers; nothing in them is a sentence.
export type Backtest = {
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
  volatility?: number
  positiveMonths?: number
  year?: { bad: number; typical: number; good: number } | null
}

export type Risk = {
  kind: "risk"
  maxDrawdown: number
  benchMaxDrawdown: number
  worstMonth: { label: string; value: number }
  stops: number
  risk: { symbol: string; weight: number; riskShare: number }[]
  alone?: { symbol: string; cagr: number; maxDrawdown: number }[]
}

// A chart's two lines, as positions in the price dates
export type Series = { kind: string; idx: number[]; strategy: number[]; bench: number[] }

export type Findings = { backtest: Backtest; risk: Risk; growth: Series; drawdown: Series }

// What Stocks knows that the notebooks don't: where they are, what the person asked for, and what each token is
export type ReportContext = {
  notebook: { title: string; url: string }
  dates: string[]
  panic: number
  maxShare?: number
  priorities: Priority[]
  skipped: string[]
  stocks: { symbol: string; name?: string; liquidity: number; impact: number }[]
  prices: string
  asOf: string
}

// What a trade costs beyond the swap fee: a share of the price lost to moving it
export const SLIPPAGE = 0.001
// How much a year better than the market has to be before it counts as better
const MATERIAL_GAP = 0.01
// The pool a token should have to be worth buying, as the person asked for in most briefs
const THIN_POOL = 100_000

const percent = (fraction: number, digits = 1) => `${fraction >= 0 ? "+" : "−"}${Math.abs(fraction * 100).toFixed(digits)}%`
const plain = (fraction: number) => `${Math.round(fraction * 100)}%`
const dollars = (amount: number) => (amount >= 1_000_000 ? `$${(amount / 1_000_000).toFixed(1)}M` : `$${Math.round(amount / 1000)}K`)
const asSeries = (dates: string[], { idx }: Series, values: number[]) =>
  idx.map((at, i) => ({ label: dates[at] ?? "", value: values[i] ?? 0 }))

type Metric = ResearchResult["metrics"][number]

// Each number a report can lead with, as the tile and the words behind its (i). A number the notebooks didn't print isn't offered, so a
// report never shows a tile with nothing in it.
function tiles({ backtest, risk }: Findings): Partial<Record<KpiId, Metric>> {
  const { cagr, benchCagr, sharpe, beta, recent, volatility, positiveMonths, year } = backtest
  const points = (cagr - benchCagr) * 100

  return {
    cagr: {
      label: "Return a year",
      value: percent(cagr),
      note: `S&P 500 ${percent(benchCagr)}`,
      help: "How much it grew each year on average, after trading costs. At 10% a year, 100 USDC becomes about 110 after one year and about 133 after three.",
    },
    maxDrawdown: {
      label: "Worst drop",
      value: percent(risk.maxDrawdown),
      note: `S&P 500 ${percent(risk.benchMaxDrawdown)}`,
      help: "The deepest fall from a high point to the next low. Someone who bought at the peak would have seen their money drop by this much before it recovered. It's the number to check against what you could live with.",
    },
    edge: {
      label: "Against the S&P 500",
      value: `${points >= 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pts`,
      note: "a year",
      help: "How many percentage points a year it earned above (or below) simply holding the S&P 500, the 500 biggest US companies. Positive means the strategy did better than doing nothing clever.",
    },
    sharpe: {
      label: "Sharpe ratio",
      value: sharpe.toFixed(2),
      note: "return per unit of risk",
      help: "How much return you got for the ups and downs you had to sit through. Higher is a smoother ride for the same return. Around 1 is good; under 0.5 means a rough ride for what it paid.",
    },
    beta: {
      label: "Beta",
      value: `${beta.toFixed(2)}×`,
      note: "1.00 = moves like the market",
      help: "How strongly it follows the market. 1.0 moves with the S&P 500; 1.5 swings half as much again in both directions; under 1 is calmer. A high beta means much of the return is just market risk.",
    },
    ...(year && {
      badYear: {
        label: "A bad year",
        value: percent(year.bad, 0),
        note: "1 year in 20 was worse",
        help: `Looking at every 12-month stretch in the test, this is roughly the 5th-worst out of 100. A typical stretch was ${percent(year.typical, 0)} and a good one ${percent(year.good, 0)}. History, not a forecast.`,
      },
    }),
    ...(positiveMonths !== undefined && {
      positiveMonths: {
        label: "Months in profit",
        value: plain(positiveMonths),
        note: "of all months",
        help: "How often a month ended higher than the one before. A strategy can win most months and still have a big loss now and then, so read it with the worst drop.",
      },
    }),
    ...(volatility !== undefined && {
      volatility: {
        label: "Ups and downs",
        value: `${(volatility * 100).toFixed(0)}% a year`,
        note: "how much it swings",
        help: "How far the value typically swings around its average in a year. At 20%, a normal year moves about 20% up or down. Higher means a bumpier ride.",
      },
    }),
    recent: {
      label: "Last 12 months",
      value: percent(recent.strategy, 0),
      note: `S&P 500 ${percent(recent.bench, 0)}`,
      help: "How it did over the most recent year of the test. Recent results matter, but one year is a small sample, so don't read too much into a single good or bad one.",
    },
  }
}

// The report, from what the notebooks found. Every number comes from a notebook's printed line; the sentences are written here from those
// numbers and from what the person asked for, so each claim can be checked against the notebook it came from.
export function toResult(findings: Findings, context: ReportContext): ResearchResult {
  const { backtest, risk, growth, drawdown } = findings
  const { notebook, dates, panic, maxShare, priorities, skipped, stocks, prices, asOf } = context

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
      : { tone: "warn", label: !withinPanic ? "Ahead, but past your limit" : "Ahead, mostly by taking more market risk" }

  const checks: ResearchResult["checks"] = [
    {
      tone: ahead ? "good" : "warn",
      text: `${ahead ? "Beat" : matched ? "About the same as" : "Behind"} just holding the S&P 500 after costs: ${percent(backtest.cagr)} a year vs ${percent(backtest.benchCagr)}.`,
    },
    {
      tone: withinPanic ? "good" : "bad",
      text: `Worst fall from a peak was ${percent(risk.maxDrawdown)}, ${withinPanic ? "inside" : "past"} the −${Math.round(panic * 100)}% you said you'd panic at. The S&P 500's was ${percent(risk.benchMaxDrawdown)}.`,
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
      tone: topRisk > topWeight + 0.15 ? "warn" : "good",
      text: `${top.map(({ symbol }) => symbol).join(" and ")} carry ${plain(topRisk)} of the risk with ${plain(topWeight)} of the money.`,
    },
  ]
  if (backtest.stops > 0)
    checks.push({
      tone: "warn",
      text: `The portfolio stop fired ${backtest.stops} ${backtest.stops === 1 ? "time" : "times"}: everything was sold, and the strategy waited before buying again.`,
    })
  if (skipped.length > 0)
    checks.push({
      tone: "warn",
      text: `${skipped.join(", ")} ${skipped.length === 1 ? "is" : "are"} not listed yet, so there is no price history to test. ${skipped.length === 1 ? "Its" : "Their"} share of the plan was left out of the test and counted as cash, so the real result would differ.`,
    })
  if (maxShare) checks.push({ tone: "good", text: `No stock was held above ${plain(maxShare)} of the money when the test started or rebalanced.` })

  const available = tiles(findings)
  const metrics = rankKpis(priorities)
    .flatMap((id) => (available[id] ? [available[id]] : []))
    .slice(0, 4)

  const thinnest = stocks.toSorted((a, b) => a.liquidity - b.liquidity)[0]
  const biggestMove = Math.max(0, ...stocks.map(({ impact }) => impact))
  const tradability: ResearchResult["tradability"] = thinnest
    ? {
        stocks: stocks.map(({ symbol, liquidity, impact }) => ({ symbol, liquidity, impact })),
        text:
          thinnest.liquidity >= THIN_POOL
            ? `All ${stocks.length} have pools of ${dollars(thinnest.liquidity)} or more on Base, and your biggest order would move a price by about ${(biggestMove * 100).toFixed(2)}%. The ${(SWAP_FEE_RATE * 100).toFixed(1)}% swap fee applies to each trade.`
            : `${thinnest.symbol}'s pool is only ${dollars(thinnest.liquidity)}, which is thin: a large order could move its price.`,
      }
    : undefined

  const alone = new Map((risk.alone ?? []).map((one) => [one.symbol, one]))
  const selection = stocks.map(({ symbol, name }) => {
    const own = alone.get(shareOf(symbol))
    return {
      symbol,
      ...(name && { name }),
      text: own
        ? `Picked from your idea. On its own it returned ${percent(own.cagr)} a year over the test, with a worst fall of ${percent(own.maxDrawdown, 0)}. That shows how it behaved, not that it will do well.`
        : "Picked from your idea. It has no price history here, so it isn't part of the test.",
    }
  })

  return {
    headline: `Over ${backtest.years} years of real prices it made ${percent(backtest.cagr)} a year, with a worst drop of ${percent(risk.maxDrawdown, 0)}`,
    summary: `A backtest of this strategy's plan on daily prices from ${backtest.from} to ${backtest.to}: its weights, looked at again every 21 trading days, ${((SWAP_FEE_RATE + SLIPPAGE) * 100).toFixed(1)}% paid on every trade, and the portfolio stop. The S&P 500 (SPY) is the comparison. It doesn't model a token drifting from its share, and past results don't predict future ones.`,
    verdict,
    metrics,
    charts: [
      {
        title: "Growth of 1 USDC",
        kind: "growth",
        format: "multiple",
        series: [
          { name: "This strategy", points: asSeries(dates, growth, growth.strategy) },
          { name: "S&P 500", points: asSeries(dates, growth, growth.bench) },
        ],
      },
      {
        title: "Fall from the highest value",
        kind: "drop",
        format: "percent",
        series: [
          { name: "This strategy", points: asSeries(dates, drawdown, drawdown.strategy) },
          { name: "S&P 500", points: asSeries(dates, drawdown, drawdown.bench) },
        ],
        mark: { label: `You'd panic at −${Math.round(panic * 100)}%`, value: -panic * 100 },
      },
    ],
    checks,
    holdings: byRisk.map(({ symbol, weight, riskShare }) => ({ symbol, weight, riskShare: Math.max(0, Math.min(1, riskShare)) })),
    steps: [
      { label: "Read the idea" },
      { label: "Get prices" },
      { label: "Backtest", url: notebook.url },
      { label: "Risk check", url: notebook.url },
      { label: "Results" },
    ],
    ...(backtest.year && { yearRange: backtest.year }),
    tradability,
    selection,
    sources: [
      { name: "Yahoo Finance", title: `Daily closing prices to ${asOf}`, url: "https://finance.yahoo.com", note: "the shares each token follows, and the S&P 500 (SPY)" },
      { name: "Sandworm", title: "The backtest and risk notebook", url: notebook.url, note: "every number can be re-run" },
      { name: "base.org", title: "Token pools and liquidity on Base", url: "https://base.org", note: "what can be bought, and how deeply" },
    ],
    notes: [],
    notebook,
    dataNote: prices,
    isExample: false,
  }
}
