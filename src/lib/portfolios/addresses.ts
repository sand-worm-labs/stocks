import { getBaseTokens } from "@/lib/markets/tokens"

import type { Portfolio } from "@/types/portfolios"
import { heldSymbols } from "./portfolio"

// Each stock held, and its contract on Base: where its live price comes from. A stock the market has no token for is left out.
export async function getHeldAddresses(portfolios: Portfolio[]): Promise<Record<string, string>> {
  const held = heldSymbols(portfolios)
  const tokens = await getBaseTokens().catch(() => [])

  return Object.fromEntries(
    tokens.filter(({ symbol }) => held.has(symbol)).map(({ symbol, address }) => [symbol, address])
  )
}
