import { z } from "zod"

import { PAPER_DEPOSIT_MAX } from "@/constants/trade"
import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

const fundsSchema = z.object({ direction: z.enum(["add", "remove"]), amount: z.number().positive().max(PAPER_DEPOSIT_MAX) })

// Puts money into a strategy, or takes cash out of it
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: fundsSchema }, async ({ ownerId, body: { direction, amount } }) => {
    const service = getStrategyService()
    const { record, lines } = direction === "add" ? await service.addFunds(ownerId, id, amount) : await service.removeFunds(ownerId, id, amount)
    return { cash: record.cash, bought: lines.filter(({ kind }) => kind === "buy").length }
  })
}
