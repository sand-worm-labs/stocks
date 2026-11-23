import { SWAP_FEE_RATE } from "@/constants/trade"

import { evaluate } from "./evaluate"
import type { History, Schedule, Strategy } from "./types"

// Trading days between one look at the strategy and the next
const EVERY: Record<Schedule, number> = { daily: 1, weekly: 5, monthly: 21 }

export type Backtest = {
  // The portfolio's value each day, from the day it starts
  values: number[]
  // How much it made over the whole of it, as a fraction
  totalReturn: number
  // The deepest it fell from a high, as a fraction below zero
  maxDrawdown: number
  // Orders placed, each a stock bought or sold
  trades: number
  // What was paid in fees
  fees: number
}

// Running the strategy over past prices. A day's decision uses prices up to the day before and is filled at the day's close, so
// it never acts on what it could not have known. Each trade pays the swap fee.
export function backtest(
  strategy: Strategy,
  history: History,
  { start = 0, deposit = 10_000, feeRate = SWAP_FEE_RATE } = {}
): Backtest {
  const days = Math.min(...Object.values(history).map((series) => series.length))
  const step = EVERY[strategy.schedule]
  // The first day with a day before it to decide from; after it, once every period
  const first = start + 1
  const units: Record<string, number> = {}
  let cash = deposit
  let trades = 0
  let fees = 0
  const values: number[] = []

  const price = (symbol: string, day: number) => history[symbol]?.[day] ?? 0
  const worth = (day: number) =>
    cash + Object.entries(units).reduce((sum, [symbol, held]) => sum + held * price(symbol, day), 0)

  for (let day = start; day < days; day++) {
    if (day >= first && (day - first) % step === 0) {
      const target = evaluate(strategy.root, history, day - 1)
      const total = worth(day)
      const symbols = new Set([...Object.keys(units), ...Object.keys(target)])

      for (const symbol of symbols) {
        const close = price(symbol, day)
        if (!close) continue
        const have = (units[symbol] ?? 0) * close
        const want = (target[symbol] ?? 0) * total
        const traded = Math.abs(want - have)
        if (traded < total * 0.001) continue
        const fee = traded * feeRate
        units[symbol] = want / close
        cash += have - want - fee
        fees += fee
        trades++
      }
    }
    values.push(worth(day))
  }

  let peak = values[0] ?? deposit
  let maxDrawdown = 0
  for (const value of values) {
    peak = Math.max(peak, value)
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1)
  }

  return { values, totalReturn: (values.at(-1) ?? deposit) / deposit - 1, maxDrawdown, trades, fees }
}
