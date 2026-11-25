import { SWAP_FEE_RATE } from "@/constants/trade"
import type { Holding } from "@/types/portfolios"

// One line of what happened to a strategy's cash and stocks. A buy or sell names the stock and the units (negative for a sale). `usdc` is
// the effect on the strategy's cash, fee included: what is spent is negative.
export type LedgerLine = {
  kind: "deposit" | "withdraw" | "buy" | "sell" | "fee"
  symbol?: string
  units?: number
  price?: number
  usdc: number
  fee?: number
  at: Date
}

// Cash that is only the dust of rounding to six places is no cash
const DUST = 1e-5
const round = (value: number) => Math.round(value * 1e6) / 1e6

export function openingLines(holdings: Holding[], amount: number, at: Date): LedgerLine[] {
  const buys = holdings
    .filter(({ units }) => units > 0)
    .map(({ symbol, units, cost }): LedgerLine => {
      const fee = cost * SWAP_FEE_RATE
      return { kind: "buy", symbol, units, price: cost / units, usdc: -(cost + fee), fee, at }
    })
  return [{ kind: "deposit", usdc: amount, at }, ...buys]
}

// What the ledger comes to: the cash left, and the stocks held, each with what it cost. A sale takes out its share of the cost at the
// average paid, so the price a stock was bought at stays what was paid, however much of it is sold.
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
    .filter(([, { units }]) => units > 0)
    .map(([symbol, { units, cost }]): Holding => ({ symbol, units, entryPrice: cost / units, cost, value: cost }))
  return { holdings, cash: Math.abs(cash) < DUST ? 0 : cash }
}

export const depositedIn = (lines: LedgerLine[]) =>
  lines.reduce((sum, { kind, usdc }) => sum + (kind === "deposit" ? usdc : 0), 0)
