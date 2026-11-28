import { z } from "zod"

import { kpisFor, prioritiesOf, reportInstructions } from "@/features/research/report-spec"
import { type MarketPack, packMarkdown } from "@/features/market/matching/market-pack"
import { describeRule } from "@/features/strategies/rules/spec"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

import { type ResearchInputs, RESULT_MARKER } from "./notebooks"
import type { Printed } from "./template-producer"

// What Sandworm's chat is told to research: the person's idea and rules, how the report should come out, and exactly what the notebook has to
// print for Stocks to write that report. It goes in the notebook as a cell the agent reads, since a chat message is short and this is not.

const fraction = "a fraction (0.12 is 12%)"

const CONTRACT = `
Print one line for each of these, each starting with \`${RESULT_MARKER}\` followed by JSON on the same line, each under 3,000 characters:

1. \`{"kind":"backtest","years":3.0,"from":"2023-11-27","to":"2026-11-24","cagr":0.2,"benchCagr":0.17,"sharpe":0.8,"beta":0.9,"alpha":0.03,"recent":{"strategy":0.09,"bench":0.12},"stops":0,"volatility":0.3,"positiveMonths":0.6,"year":{"bad":-0.18,"typical":0.14,"good":0.52}}\`
   The strategy's growth a year (cagr) and the S&P 500's (benchCagr), the Sharpe ratio, its beta and alpha against the S&P 500, the last 12 months of each, how many times the portfolio stop sold everything, its yearly volatility, the share of months that were up, and a bad, typical and good 12-month stretch (the 5th, 50th and 95th percentile; null if the test is too short). All ${fraction}.
2. \`{"kind":"growth","idx":[0,5,10],"strategy":[1,1.01,1.03],"bench":[1,1.0,1.02]}\`
   What 1 USDC would have grown to, for the strategy and for the S&P 500, one point a week. \`idx\` are positions in \`DATA["dates"]\`, and the three lists are the same length. Start both at 1.
3. \`{"kind":"drawdown","idx":[0,5,10],"strategy":[0,-1.5,-0.7],"bench":[0,-0.4,0]}\`
   How far below its highest value each was, in percent (never above 0), on the same weeks as the growth line.
4. \`{"kind":"risk","maxDrawdown":-0.24,"benchMaxDrawdown":-0.19,"worstMonth":{"label":"2026-11","value":-0.11},"stops":0,"risk":[{"symbol":"NVDAc","weight":0.25,"riskShare":0.4}],"alone":[{"symbol":"NVDAc","cagr":0.35,"maxDrawdown":-0.37}]}\`
   The worst fall from a peak for each (${fraction}), the worst month, and for each stock its weight, its share of the portfolio's risk (these add up to 1) and how it did on its own.
5. \`{"kind":"name","name":"Four growth stocks aiming for 20%"}\`
   A short, specific name for the strategy that fits the person's idea: under 60 characters, plain words, no quotes, and not the words "strategy" or "portfolio".
`

// The test to run, in the terms the Prices and plan cell holds it. This is the plan, not the answer: what comes out is the agent's work.
const METHOD = `Test the plan on the real prices in \`DATA\`: hold \`DATA["weights"]\` (what is left is cash), look at the portfolio again every 21 trading days, pay \`DATA["cost"]\` on every trade, and sell everything if the portfolio falls \`DATA["stop"]\` from its high, staying in cash for \`DATA["pause"]\` trading days. \`DATA["benchmark"]\` is the S&P 500 (SPY), the comparison. Use only these prices and say so if a stock has none.`

export function briefMarkdown(record: StrategyRecord, inputs: ResearchInputs, pack?: MarketPack) {
  const priorities = prioritiesOf(record.brief, record.rules)
  const kpis = kpisFor(priorities)
  const rules = record.rules.map((rule) => `- ${describeRule(rule)}`).join("\n")

  return [
    `# Brief: ${inputs.name}`,
    `**The person's idea, in their words:** ${record.brief}`,
    `**The rules it was turned into:**\n${rules}`,
    ...(pack ? [`## What the market on Base holds for this idea\nFound by what each stock is (its sector and industry), as of ${pack.asOf.slice(0, 10)}. The plan below was drawn from these. Say in the report which of them you looked at and which you left out, and why.\n\n${packMarkdown(pack)}`] : []),
    `## How the report should come out\n${reportInstructions(priorities, kpis)}`,
    `## The test\n${METHOD}`,
    `## What to print\n${CONTRACT}`,
    "Never promise a return. Say plainly what the history shows, and how wide the spread was.",
  ].join("\n\n")
}

// The first message of the chat, which has to be short. It points at the brief and says what to leave alone.
export const askForResearch = (name: string) =>
  `Do the research for "${name}" in this notebook, and only in this one. Read the Brief cell first. Lay the notebook out as the Brief says: a "Start here" cell, then the numbered parts, each with a heading cell titled exactly as given, in that order. Build their python cells so they read DATA from the Prices and plan cell, run them, and make them print what the Brief asks for. Leave the Brief and the Prices and plan cells as they are.`

export const askToFix = (problems: string[]) =>
  `The notebook isn't done: ${problems.join("; ")}. Fix the cells, run them again, and print those lines exactly as the Brief describes.`

const number = z.number().finite()
const weekly = z.object({ idx: z.array(number).min(2), strategy: z.array(number).min(2), bench: z.array(number).min(2) })

const LINES = {
  backtest: z.object({
    years: number,
    from: z.string(),
    to: z.string(),
    cagr: number,
    benchCagr: number,
    sharpe: number,
    beta: number,
    alpha: number,
    recent: z.object({ strategy: number, bench: number }),
    stops: number,
  }),
  growth: weekly,
  drawdown: weekly,
  risk: z.object({
    maxDrawdown: number,
    benchMaxDrawdown: number,
    worstMonth: z.object({ label: z.string(), value: number }),
    stops: number,
    risk: z.array(z.object({ symbol: z.string(), weight: number, riskShare: number })).min(1),
  }),
}

// What is wrong with what the notebook printed, said so the agent can fix it: a line that is missing, or one that is there without what the
// report reads from it. Empty when it is all there.
export function problemsWith(lines: Printed[]) {
  return (Object.keys(LINES) as (keyof typeof LINES)[]).flatMap((kind) => {
    const line = lines.findLast((printed) => printed.kind === kind)
    if (!line) return [`it never printed the "${kind}" line`]
    const checked = LINES[kind].safeParse(line)
    if (checked.success) return []
    const fields = [...new Set(checked.error.issues.map(({ path }) => path.join(".") || "(the line)"))].join(", ")
    return [`the "${kind}" line is missing or has wrong: ${fields}`]
  })
}
