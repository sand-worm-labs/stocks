import type { Report } from "@/features/research/types/report.types"

import { makeFan, makeGrowth } from "./series"

const O1 = { name: "o1", url: "https://launch.o1.exchange/stocks", title: "o1 Launchpad · stocks on Base" }
const BASE = { name: "base.org", url: "https://www.base.org/stocks", title: "Base · tokenized stocks" }
const VERDICT = {
  name: "verdict.co.uk",
  url: "https://www.verdict.co.uk/nvidia-q4-fy26-results/",
  title: "NVIDIA Q4 FY26 results",
}
const AS_OF = "2026-11-20T01:50:00Z"

const original: Report = {
  version: 1,
  verdict: { label: "Some edge, mostly market risk", tone: "warning" },
  headline: "It beat the S&P 500 in the backtest, but mostly by taking more market risk.",
  plan: "Buy 4 stocks for 400 USDC · keep 100 USDC as cash",
  metrics: [
    { id: "cagr", label: "Growth a year", term: "CAGR", value: 0.297, kind: "percent", benchmark: 0.172 },
    { id: "drawdown", label: "Worst drop", term: "Max drawdown", value: -0.298, kind: "percent", benchmark: -0.129 },
    {
      id: "sharpe",
      label: "Reward for the risk",
      term: "Sharpe ratio",
      value: 0.97,
      kind: "ratio",
      note: "return per unit of risk",
    },
    {
      id: "beta",
      label: "Swings vs market",
      term: "Beta",
      value: 1.57,
      kind: "multiple",
      note: "1.00 = moves like the market",
    },
  ],
  allocation: [
    { symbol: "NVDAc", weight: 0.2 },
    { symbol: "TSLAc", weight: 0.2 },
    { symbol: "AMZNc", weight: 0.2 },
    { symbol: "GOOGLc", weight: 0.2 },
    { symbol: "USDC", weight: 0.2 },
  ],
  summary: [
    "400 USDC across NVIDIA, Amazon, Alphabet and Tesla at 20% each; 100 USDC stays as cash.",
    "Over 3 years it grew +29.7% a year vs +17.2% for the S&P 500, but its worst drop was −30%.",
    "That's past the −20% you said you'd panic at.",
  ],
  checks: {
    honesty: [
      { id: "h1", tone: "positive", text: "Beat just holding the S&P 500 after costs: +29.7% a year vs +17.2%." },
      {
        id: "h2",
        tone: "positive",
        term: "Out-of-sample",
        text: "Still ahead on the 12 months it wasn't built on: +23% vs +8%.",
      },
      {
        id: "h3",
        tone: "warning",
        term: "Alpha",
        text: "Beta 1.57: most of the extra return is extra market risk. True edge (alpha) is about +5% a year.",
      },
      {
        id: "h4",
        tone: "warning",
        term: "Factor concentration",
        text: "The 4 stocks move together: one big-tech bet explains 78% of the risk.",
      },
      { id: "h6", tone: "negative", text: "Worst drop −30% is past the −20% you said you'd panic at." },
    ],
    bias: [
      {
        id: "b1",
        tone: "positive",
        term: "Look-ahead bias",
        text: "No future data used: company numbers count from the day they were published, and trades happen at the next price.",
      },
      {
        id: "b2",
        tone: "positive",
        term: "Data snooping",
        text: "Rules were locked before testing. 2 versions tried, so the reward-for-risk score is marked down: 0.97 → 0.91.",
      },
      {
        id: "b3",
        tone: "positive",
        term: "Overfitting",
        text: "Same picture with a 15%, 20% or 25% cap: growth a year stays between +26% and +32%.",
      },
      {
        id: "b4",
        tone: "positive",
        term: "Transaction costs",
        text: "Fees, the bid-ask spread on Base (about 0.2%) and 0.1% slippage are included. They cut growth a year from +31.4% to +29.7%.",
      },
      {
        id: "b5",
        tone: "warning",
        term: "Survivorship bias",
        text: "Tested on today's buyable stocks. Companies that fell or were delisted since 2023 aren't in the test, so results are likely too high.",
      },
    ],
    overfit: [
      { id: "o1", tone: "positive", text: "Tested on 12 months it wasn't built on, and still ahead." },
      { id: "o2", tone: "warning", text: "Only 36 monthly rebalances: a small sample." },
      { id: "o3", tone: "warning", text: "A random big-tech mix of 4 would have beaten this in 38% of tries." },
      { id: "o4", tone: "positive", text: "No settings were tuned to fit the past." },
    ],
  },
  performance: {
    start: "2023-11",
    holdoutMonths: 12,
    portfolio: makeGrowth(192_612, 0.09, 1.331 ** 2, 1.23),
    benchmark: makeGrowth(173_121, 0.04, 1.22 ** 2, 1.081),
  },
  periods: [
    { label: "Built on (Nov 23–Nov 25)", term: "In-sample", portfolio: 0.331, benchmark: 0.22 },
    { label: "Never seen (last 12 months)", term: "Out-of-sample", portfolio: 0.23, benchmark: 0.081 },
  ],
  drawdown: {
    text: "Its worst fall from a peak was −30%; the worst single month was May 24 at −12%. In a typical year there's a 15% chance of ending down.",
    bad: -0.14,
    median: 0.3,
    good: 0.99,
    note: "Volatility drag: the average month made +2.5% but swings cut the compounded month to +2.2%. Big swings cost real return.",
    fan: makeFan(0.3, -0.14, 0.99),
  },
  tolerance: {
    panic: -0.2,
    worst: -0.298,
    fits: false,
    text: "Probably not. You said you'd panic at −20%; this fell −30% in the backtest.",
  },
  concentration: [
    { symbol: "NVDAc", weight: 0.2, risk: 0.34 },
    { symbol: "TSLAc", weight: 0.2, risk: 0.31 },
    { symbol: "AMZNc", weight: 0.2, risk: 0.18 },
    { symbol: "GOOGLc", weight: 0.2, risk: 0.17 },
    { symbol: "USDC", weight: 0.2, risk: 0 },
  ],
  liquidity: [
    { symbol: "NVDAc", token: 144.87, share: 144.52 },
    { symbol: "AMZNc", token: 256.5, share: 256.1 },
    { symbol: "GOOGLc", token: 273.16, share: 273.4 },
    { symbol: "TSLAc", token: 370, share: 368.9 },
  ],
  venue: {
    facts: [
      { label: "Issuer", value: "Coinbase · B20 tokens" },
      { label: "What you own", value: "Price exposure, no voting rights" },
      { label: "Token trades", value: "24/7 on Base" },
      { label: "Shares trade", value: "Mon–Fri, US market hours" },
      { label: "Contract", value: "0x… per token" },
    ],
    sources: [O1, BASE],
    asOf: AS_OF,
  },
  researchNote: {
    text: "ISRG, SYM, TER, ROK, CGNX, ZBRA, SERV and RR are listed with no token supply.",
    sources: [VERDICT, O1],
    asOf: AS_OF,
  },
  research: [
    {
      symbol: "NVDAc",
      label: "Fact",
      text: "Automotive & robotics revenue was $604M of $68.1B in Q4 FY26, under 1%.",
      source: VERDICT,
    },
    { symbol: "TSLAc", label: "Assumption", text: "Building humanoid robots; not yet a reported revenue line." },
    { symbol: "AMZNc", label: "Assumption", text: "Runs robots across its warehouse network." },
    {
      symbol: "GOOGLc",
      label: "Opinion",
      text: "Robotics exposure through self-driving and research is real but indirect.",
    },
  ],
  sources: [
    { ...O1, note: "Prices, liquidity, supply" },
    { ...BASE, note: "Token list" },
    { ...VERDICT, note: "NVIDIA robotics revenue" },
    {
      name: "nasdaq.com",
      url: "https://www.nasdaq.com/press-release/intuitive-announces-preliminary-fourth-quarter-and-full-year-2025-results-2026-01-14",
      title: "Intuitive FY2025 results",
      note: "Specialist check",
    },
    {
      name: "sec.gov",
      url: "https://www.sec.gov/Archives/edgar/data/1024478/000102447825000112/fy2025ex99.htm",
      title: "Rockwell 8-K, Nov 2025",
      note: "Specialist check",
    },
    { name: "Sandworm", url: "https://app.sandwormlab.xyz/", title: "Your rules, locked 20 Nov", note: "Your 4 rules" },
  ],
}

const lessRisk: Report = {
  ...original,
  version: 2,
  verdict: { label: "Some edge, fits your −20%", tone: "positive" },
  headline: "Less return, but a worst drop you said you could live with.",
  plan: "Version 2 · less risk: 300 USDC in 4 stocks, 200 USDC cash",
  metrics: [
    { id: "cagr", label: "Growth a year", term: "CAGR", value: 0.214, kind: "percent", was: 0.297 },
    { id: "drawdown", label: "Worst drop", term: "Max drawdown", value: -0.174, kind: "percent", was: -0.298 },
    { id: "sharpe", label: "Reward for the risk", term: "Sharpe ratio", value: 1.02, kind: "ratio", was: 0.97 },
    { id: "beta", label: "Swings vs market", term: "Beta", value: 1.03, kind: "multiple", was: 1.57 },
  ],
  allocation: [
    { symbol: "NVDAc", weight: 0.15 },
    { symbol: "AMZNc", weight: 0.15 },
    { symbol: "GOOGLc", weight: 0.15 },
    { symbol: "TSLAc", weight: 0.15 },
    { symbol: "USDC", weight: 0.4 },
  ],
  summary: [],
  changed: "Each stock drops from 20% to 15%, and cash rises to 40%. Same stocks, same rules.",
  comparison: [
    { label: "Growth a year", term: "CAGR", before: "+29.7%", after: "+21.4%" },
    { label: "Worst drop", term: "Max drawdown", before: "−29.8%", after: "−17.4%" },
    { label: "Reward for the risk", term: "Sharpe ratio", before: "0.97", after: "1.02" },
    { label: "Swings vs market", term: "Beta", before: "1.57×", after: "1.03×" },
    { label: "Fits your −20%", before: "No", after: "Yes" },
  ],
  tolerance: { panic: -0.2, worst: -0.174, fits: true, text: "Yes. Its worst drop was −17%, inside your −20%." },
}

export const reportMockData = { 1: original, 2: lessRisk } as const
