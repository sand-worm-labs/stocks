import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { startTrading, tradeSchema } from "@/lib/trade/start"

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: tradeSchema }, async ({ ownerId, body: trade }) => {
    await startTrading(getStrategyService(), ownerId, id, trade)
    return { id }
  })
}
