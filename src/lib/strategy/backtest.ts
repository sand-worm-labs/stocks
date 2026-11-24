import { SWAP_FEE_RATE } from "@/constants/trade"

import { type Band, bandsOf, evaluate } from "./evaluate"
import type { History, Schedule, Strategy, Weights } from "./types"

// Trading days between one look at the strategy and the next
const EVERY: Record<Schedule, number> = { daily: 1, weekly: 5, monthly: 21 }

// Exits that act on what was paid for a stock, as the stop-loss and take-profit rules do. Once one fires, the stock is sold at that
// day's close and is not bought again for `cooldown` trading days, so a stock that has just been stopped out isn't bought straight
// back by the next look.
export type Exits = {
  stopLoss?: number
  takeProfit?: number
  cooldown?: number
  // For the portfolio as a whole: once its value is this far below its high (since it last started), everything is sold and it sits in
  // cash for `pause` trading days, then starts again from there
  portfolioStop?: number
  pause?: number
}

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
  // Sales forced by a stop-loss or take-profit
  exits: number
}

// Running the strategy over past prices. A day's decision uses prices up to the day before and is filled at the day's close, so
// it never acts on what it could not have known. Each trade pays the swap fee.
export function backtest(
  strategy: Strategy,
  history: History,
  {
    start = 0,
    deposit = 10_000,
    feeRate = SWAP_FEE_RATE,
    stopLoss,
    takeProfit,
    cooldown = 21,
    portfolioStop,
    pause = 63,
  }: {
    start?: number
    deposit?: number
    feeRate?: number
  } & Exits = {}
): Backtest {
  const days = Math.min(...Object.values(history).map((series) => series.length))
  const step = EVERY[strategy.schedule]
  // The first day with a day before it to decide from; after it, once every period
  const first = start + 1
  const units: Record<string, number> = {}
  let cash = deposit
  let trades = 0
  let fees = 0
  let exits = 0
  // What each stock held cost on average, and the day before which it may not be bought again
  const paid: Record<string, number> = {}
  const blocked: Record<string, number> = {}
  // The portfolio's high, and the day it may trade again after being stopped out as a whole
  let high = deposit
  let resumeAt = 0
  const values: number[] = []
  // What the strategy last decided, and the stocks it keeps inside a rebalance: those are only traded back between looks
  let target: Weights = {}
  let bands: Record<string, Band> = {}

  const price = (symbol: string, day: number) => history[symbol]?.[day] ?? 0
  const worth = (day: number) =>
    cash + Object.entries(units).reduce((sum, [symbol, held]) => sum + held * price(symbol, day), 0)

  for (let day = start; day < days; day++) {
    if (day >= first) {
      if (portfolioStop !== undefined) {
        if (day === resumeAt) high = worth(day)
        high = Math.max(high, worth(day))
        if (day >= resumeAt && worth(day) / high - 1 <= -portfolioStop) {
          for (const [symbol, held] of Object.entries(units)) {
            if (held === 0) continue
            const sold = held * price(symbol, day)
            const fee = Math.abs(sold) * feeRate
            cash += sold - fee
            fees += fee
            units[symbol] = 0
            trades++
          }
          resumeAt = day + pause
          exits++
        }
        // Out of the market until the pause is over
        if (day < resumeAt) {
          values.push(worth(day))
          continue
        }
      }
      const look = (day - first) % step === 0
      if (look) {
        target = evaluate(strategy.root, history, day - 1)
        bands = bandsOf(strategy.root, history, day - 1)
      }
      // A stock that has fallen or risen far enough from what was paid is sold at once, before anything else is decided
      for (const [symbol, held] of Object.entries(units)) {
        const close = price(symbol, day)
        const cost = paid[symbol]
        if (!close || !cost || held <= 0) continue
        const change = close / cost - 1
        if ((stopLoss !== undefined && change <= -stopLoss) || (takeProfit !== undefined && change >= takeProfit)) {
          const fee = held * close * feeRate
          cash += held * close - fee
          fees += fee
          units[symbol] = 0
          blocked[symbol] = day + cooldown
          exits++
          trades++
        }
      }
      const total = worth(day)
      const symbols = new Set([...Object.keys(units), ...Object.keys(target)])

      for (const symbol of symbols) {
        const close = price(symbol, day)
        if (!close) continue
        const have = (units[symbol] ?? 0) * close
        const want = (blocked[symbol] ?? 0) > day ? 0 : (target[symbol] ?? 0) * total
        const traded = Math.abs(want - have)
        if (traded < total * 0.001) continue
        // A stock that is held and still wanted, inside a rebalance, is traded back only on its own check days, and only once it
        // has drifted past its band. Everything else is traded on the strategy's looks.
        const band = bands[symbol]
        if (band && have > 0 && want > 0) {
          if ((day - first) % EVERY[band.every] !== 0 || traded / total <= band.drift) continue
        } else if (!look) continue
        const fee = traded * feeRate
        const bought = want / close - (units[symbol] ?? 0)
        if (bought > 0)
          paid[symbol] = ((units[symbol] ?? 0) * (paid[symbol] ?? close) + bought * close) / (want / close)
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

  return { values, totalReturn: (values.at(-1) ?? deposit) / deposit - 1, maxDrawdown, trades, fees, exits }
}
