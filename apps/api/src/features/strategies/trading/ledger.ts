import { SWAP_FEE_RATE } from "./trade.constants"
import type { Holding } from "@/features/strategies/types/holding.types"
import type { LedgerLine, StrategyRecord } from "@/features/strategies/types/strategy-record"

// Cash that is only the dust of rounding to six places is no cash
const DUST = 1e-5
const round = (value: number) => Math.round(value * 1e6) / 1e6

export class LedgerError extends Error {}

// What the ledger comes to: the cash left, and the stocks held, each with what it cost. A sale takes out its share of the cost at the average
// paid, so the price a stock was bought at stays what was paid, however much of it is sold.
export function positionsOf(lines: LedgerLine[]) {
  const held = new Map<string, { units: number; cost: number }>()
  for (const { kind, symbol, units, price } of lines) {
    if (!symbol || !units || price === undefined) continue
    const position = held.get(symbol) ?? { units: 0, cost: 0 }
    if (kind === "buy") {
      position.units += units
      position.cost += units * price
    } else if (kind === "sell" && position.units > 0) {
      const sold = Math.min(-units, position.units)
      position.cost -= (position.cost / position.units) * sold
      position.units -= sold
    }
    held.set(symbol, position)
  }

  const cash = round(lines.reduce((sum, { usdc }) => sum + usdc, 0))
  const holdings = [...held]
    .filter(([, { units }]) => units > UNIT_DUST)
    .map(([symbol, { units, cost }]): Holding => ({ symbol, units, entryPrice: cost / units, cost, value: cost }))
  return { holdings, cash: Math.abs(cash) < DUST ? 0 : cash }
}

const UNIT_DUST = 1e-9

// How the strategy started: the money put in, and the stocks it bought with it. A strategy kept without a ledger (in a file, before it had
// one) gets this made from what it holds, the way the API makes it when the strategy first goes live.
export function openingLedger({ funding, holdings, startedAt, updatedAt }: StrategyRecord): LedgerLine[] {
  const at = startedAt ?? updatedAt
  const buys = holdings
    .filter(({ units }) => units > 0)
    .map(({ symbol, units, cost }): LedgerLine => {
      const fee = cost * SWAP_FEE_RATE
      return { kind: "buy", symbol, units, price: cost / units, usdc: -(cost + fee), fee, at }
    })
  return [{ kind: "deposit", usdc: funding?.amount ?? 0, at }, ...buys]
}

export const ledgerOf = (record: StrategyRecord) => record.ledger ?? openingLedger(record)

type Price = (symbol: string) => number | undefined

// Money put in, and what is bought with it: spread over the stocks that still have room under the cap, in proportion to that room, with
// what can't be placed left as cash. Each purchase pays the swap fee out of the money put in.
export function depositLines(
  record: StrategyRecord,
  amount: number,
  room: { symbol: string; spend: number }[],
  price: Price,
  at: string
): LedgerLine[] {
  if (!(amount > 0)) throw new LedgerError("Put in an amount")
  const wanted = room.reduce((sum, { spend }) => sum + spend, 0)
  // What is spent, with its fee, can't be more than what was put in
  const spendable = Math.min(wanted, amount / (1 + SWAP_FEE_RATE))
  const scale = wanted > 0 ? spendable / wanted : 0

  const buys = room.flatMap(({ symbol, spend }): LedgerLine[] => {
    const cost = spend * scale
    const at$ = price(symbol)
    if (!(cost > 0.005) || !at$) return []
    const fee = cost * SWAP_FEE_RATE
    return [{ kind: "buy", symbol, units: cost / at$, price: at$, usdc: -(cost + fee), fee, at }]
  })
  return [{ kind: "deposit", usdc: amount, at }, ...buys]
}

// Cash taken out of the strategy. Only cash can be: the stocks are sold first, to make more of it.
export function withdrawLine(record: StrategyRecord, amount: number, at: string): LedgerLine {
  const { cash } = positionsOf(ledgerOf(record))
  if (!(amount > 0)) throw new LedgerError("Take out an amount")
  if (amount > cash + DUST) throw new LedgerError(`Only ${cash.toFixed(2)} USDC is in cash. Sell a stock to free up more`)
  return { kind: "withdraw", usdc: -amount, at }
}

// A share of one stock, or of every stock, sold at today's price; the swap fee comes off what is received.
export function saleLines(record: StrategyRecord, symbols: string[], share: number, price: Price, at: string): LedgerLine[] {
  if (!(share > 0 && share <= 1)) throw new LedgerError("Choose how much to sell")
  const { holdings } = positionsOf(ledgerOf(record))
  const chosen = holdings.filter(({ symbol }) => symbols.includes(symbol))
  if (!chosen.length) throw new LedgerError("That isn't held")

  return chosen.map(({ symbol, units }): LedgerLine => {
    const now = price(symbol)
    if (!now) throw new LedgerError(`No price for ${symbol} to sell at`)
    const sold = units * share
    const proceeds = sold * now
    const fee = proceeds * SWAP_FEE_RATE
    return { kind: "sell", symbol, units: -sold, price: now, usdc: proceeds - fee, fee, at }
  })
}

// The record with new lines added to its ledger, and what it holds and has in cash made again from it
export function withLines(record: StrategyRecord, lines: LedgerLine[]): StrategyRecord {
  const ledger = [...ledgerOf(record), ...lines]
  return { ...record, ledger, ...positionsOf(ledger) }
}
