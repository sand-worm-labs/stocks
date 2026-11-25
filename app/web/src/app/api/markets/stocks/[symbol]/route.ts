import { respond } from "@/lib/api/respond"
import { getStockDetail } from "@/lib/markets/source"
import { StrategyError } from "@/lib/strategies/service"

type SymbolParams = { params: Promise<{ symbol: string }> }

// One stock in full. Only one that can be bought has a page.
export async function GET(request: Request, { params }: SymbolParams) {
  const { symbol } = await params
  return respond(request, {}, async () => {
    const found = await getStockDetail(symbol)
    if (!found) throw new StrategyError("That stock isn't on offer, or has no token to buy yet", 404)
    return found
  })
}
