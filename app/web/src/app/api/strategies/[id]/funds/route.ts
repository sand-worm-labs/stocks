import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { changeFunds, fundsSchema } from "@/lib/trade/money"

// Puts money into a strategy, or takes cash out of it
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params
  return respond(request, { body: fundsSchema }, ({ ownerId, body }) => changeFunds(getStrategyService(), ownerId, id, body))
}
