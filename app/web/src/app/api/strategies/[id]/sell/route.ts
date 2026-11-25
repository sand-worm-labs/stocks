import { z } from "zod"

import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// No symbols means everything the strategy holds
const sellSchema = z.object({ symbols: z.array(z.string().max(20)).max(50).optional(), share: z.number().gt(0).max(1) })

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: sellSchema }, async ({ ownerId, body }) => {
    const { record, lines } = await getStrategyService().sell(ownerId, id, body)
    const received = lines.reduce((sum, { usdc }) => sum + usdc, 0)
    return { cash: record.cash, received }
  })
}
