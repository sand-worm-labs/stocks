import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { sellSchema, sellStocks } from "@/lib/trade/money"

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params
  return respond(request, { body: sellSchema }, ({ ownerId, body }) => sellStocks(getStrategyService(), ownerId, id, body))
}
