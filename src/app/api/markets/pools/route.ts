import { getAllPoolQuotes } from "@/lib/markets/pools"
import { getBaseTokens } from "@/lib/markets/tokens"

export const dynamic = "force-dynamic"

// The pool every tokenized stock on Base trades in, with its price and liquidity right now
export async function GET() {
  const tokens = await getBaseTokens()
  const quotes = await getAllPoolQuotes(tokens.map(({ address }) => address))

  return Response.json(quotes, { headers: { "Cache-Control": "no-store" } })
}
