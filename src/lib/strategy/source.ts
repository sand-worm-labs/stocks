import { STOCK_POOL } from "@/_mockdata/portfolios"
import {
  buildStrategyMockData,
  sampleStrategyMockData,
  STRATEGY_KIND_BY_ID,
  STRATEGY_KINDS,
} from "@/_mockdata/strategies"
import type { Portfolio } from "@/lib/portfolios/types"
import { pick, seedOf } from "@/lib/seed"

import type { Strategy } from "./types"

// The strategy a portfolio runs, built from the stocks it holds: its own kind of logic, and its own numbers. Without a
// portfolio, the sample.
export async function getStrategy(portfolio?: Portfolio): Promise<Strategy> {
  if (!portfolio) return sampleStrategyMockData

  const seed = seedOf(portfolio.id)
  const held = portfolio.holdings.map(({ symbol }) => symbol)
  // A draft holds nothing yet, so its stocks are three of the pool, the same three each time
  const symbols = held.length >= 3 ? held : [0, 1, 2].map((n) => pick(STOCK_POOL, seed, n * 3 + 1))
  const kind = STRATEGY_KIND_BY_ID[portfolio.id] ?? pick(STRATEGY_KINDS, seed, 11)

  return buildStrategyMockData(kind, [...new Set(symbols)], seed)
}
