import { pick } from "@/lib/seed"
import type { Condition, Node, Schedule, Strategy } from "@/types/strategy"

const LEADERS = ["NVDAc", "AMZNc", "GOOGLc", "METAc", "TSLAc", "AAPLc"]

export const sampleStrategyMockData: Strategy = {
  name: "Trend and momentum",
  schedule: "weekly",
  root: {
    type: "if",
    condition: {
      left: { symbol: "AAPLc", indicator: { kind: "price" } },
      op: ">",
      right: { symbol: "AAPLc", indicator: { kind: "sma", days: 50 } },
    },
    then: {
      type: "group",
      name: "Ride the leaders",
      weighting: "specified",
      children: [
        {
          node: { type: "filter", pick: "top", count: 3, by: { kind: "return", days: 30 }, from: LEADERS },
          weight: 70,
        },
        { node: { type: "asset", symbol: "AAPLc" }, weight: 30 },
      ],
    },
    else: {
      type: "if",
      condition: {
        left: { symbol: "GOOGLc", indicator: { kind: "rsi", days: 14 } },
        op: "<",
        right: { value: 30 },
      },
      then: { type: "asset", symbol: "GOOGLc" },
      else: {
        type: "group",
        name: "Play it safe",
        weighting: "inverse-volatility",
        days: 20,
        children: [
          { node: { type: "asset", symbol: "AAPLc" } },
          { node: { type: "asset", symbol: "GOOGLc" } },
          { node: { type: "asset", symbol: "METAc" } },
        ],
      },
    },
  },
}

const STEADY_UNIVERSE = ["AAPLc", "GOOGLc", "NVDAc", "METAc", "AMZNc", "TSLAc", "NFLXc", "LLYc", "TTWOc"]

const steadyLeadersStrategyMockData: Strategy = {
  name: "Steady leaders",
  schedule: "monthly",
  root: {
    type: "rebalance",
    drift: 0.05,
    every: "weekly",
    child: {
      type: "filter",
      pick: "top",
      count: 4,
      by: { kind: "return", days: 126 },
      from: STEADY_UNIVERSE,
      weighting: "inverse-volatility",
      days: 60,
    },
  },
}

export const HAND_MADE_STRATEGIES: Record<string, Strategy> = { "steady-leaders": steadyLeadersStrategyMockData }

type StrategyKind = "trend" | "dip" | "defensive" | "rotation" | "relative" | "calm" | "laggards"

export const STRATEGY_KIND_BY_ID: Record<string, StrategyKind> = {
  "robotics-20": "trend",
  "big-tech-35": "defensive",
  "memory-space": "rotation",
  "crypto-treasuries": "dip",
  "ai-chips-25": "relative",
}

export const STRATEGY_KINDS: readonly StrategyKind[] = [
  "trend",
  "dip",
  "defensive",
  "rotation",
  "relative",
  "calm",
  "laggards",
]

const price = (symbol: string) => ({ symbol, indicator: { kind: "price" } as const })
const asset = (symbol: string): Node => ({ type: "asset", symbol })

export function buildStrategyMockData(kind: StrategyKind, symbols: string[], seed: number): Strategy {
  const [a = "", b = a, c = b] = symbols
  const sma = pick([20, 50, 100], seed, 1)
  const days = pick([20, 30, 60], seed, 3)
  const rsi = pick([25, 30, 35], seed, 5)
  const fall = pick([0.08, 0.1, 0.15], seed, 7)
  const count = Math.max(1, Math.min(2, symbols.length - 1))
  const schedule = pick<Schedule>(["daily", "weekly", "monthly"], seed, 9)
  const rising = (symbol: string): Condition => ({
    left: price(symbol),
    op: ">",
    right: { symbol, indicator: { kind: "sma", days: sma } },
  })

  switch (kind) {
    case "trend":
      return {
        name: "Trend and momentum",
        schedule,
        root: {
          type: "if",
          condition: rising(a),
          then: {
            type: "group",
            name: "Ride the leaders",
            weighting: "specified",
            children: [
              { node: { type: "filter", pick: "top", count, by: { kind: "return", days }, from: symbols }, weight: 70 },
              { node: asset(a), weight: 30 },
            ],
          },
          else: {
            type: "group",
            name: "Play it safe",
            weighting: "inverse-volatility",
            days: 20,
            children: symbols.map((symbol) => ({ node: asset(symbol) })),
          },
        },
      }
    case "dip":
      return {
        name: "Buy the dip",
        schedule,
        root: {
          type: "if",
          condition: { left: { symbol: a, indicator: { kind: "rsi", days: 14 } }, op: "<", right: { value: rsi } },
          then: asset(a),
          else: {
            type: "if",
            condition: {
              all: [
                rising(b),
                { left: { symbol: c, indicator: { kind: "return", days } }, op: ">", right: { value: 0 } },
              ],
            },
            then: {
              type: "group",
              name: "Follow the strong two",
              weighting: "equal",
              children: [{ node: asset(b) }, { node: asset(c) }],
            },
            else: {
              type: "group",
              name: "Wait it out",
              weighting: "inverse-volatility",
              days: 20,
              children: symbols.map((symbol) => ({ node: asset(symbol) })),
            },
          },
        },
      }
    case "defensive":
      return {
        name: "Step aside in a slump",
        schedule,
        root: {
          type: "if",
          condition: {
            any: [
              { left: { symbol: a, indicator: { kind: "drawdown", days: 30 } }, op: "<", right: { value: -fall } },
              { left: { symbol: b, indicator: { kind: "rsi", days: 14 } }, op: ">", right: { value: 75 } },
            ],
          },
          then: { type: "cash" },
          else: {
            type: "group",
            name: "Hold them evenly",
            weighting: "equal",
            children: symbols.map((symbol) => ({ node: asset(symbol) })),
          },
        },
      }
    case "rotation":
      return {
        name: "Rotate to the strongest",
        schedule: "monthly",
        root: { type: "filter", pick: "top", count, by: { kind: "return", days }, from: symbols },
      }
    case "relative":
      return {
        name: "Back the leader",
        schedule,
        root: {
          type: "if",
          condition: {
            left: { symbol: a, indicator: { kind: "return", days } },
            op: ">",
            right: { symbol: b, indicator: { kind: "return", days } },
          },
          then: {
            type: "group",
            name: `Lean on ${a}`,
            weighting: "specified",
            children: [
              { node: asset(a), weight: 50 },
              { node: asset(b), weight: 30 },
              { node: asset(c), weight: 20 },
            ],
          },
          else: {
            type: "group",
            name: `Lean on ${b}`,
            weighting: "specified",
            children: [
              { node: asset(b), weight: 50 },
              { node: asset(a), weight: 30 },
              { node: asset(c), weight: 20 },
            ],
          },
        },
      }
    case "calm":
      return {
        name: "Only when it's calm",
        schedule,
        root: {
          type: "if",
          condition: {
            all: [
              rising(a),
              { left: { symbol: a, indicator: { kind: "volatility", days: 20 } }, op: "<", right: { value: 0.03 } },
            ],
          },
          then: {
            type: "group",
            name: "Calm and rising",
            weighting: "equal",
            children: symbols.map((symbol) => ({ node: asset(symbol) })),
          },
          else: { type: "cash" },
        },
      }
    case "laggards":
      return {
        name: "Buy the laggards",
        schedule: "weekly",
        root: {
          type: "filter",
          pick: "bottom",
          count,
          by: { kind: "return", days },
          from: symbols,
          weighting: "equal",
        },
      }
  }
}
