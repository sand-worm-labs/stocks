import { z } from "zod"

import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// `result` is checked in full by the service, which says what is wrong with it; here it is only required to be there
const handBackSchema = z.object({ result: z.unknown() })

// The research for a strategy that is waiting for it, handed back by whoever did it. Once per strategy, and only while it is waiting.
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: handBackSchema }, async ({ ownerId, body }) => {
    const { stage } = await getStrategyService().completeResearch(ownerId, id, body.result)
    return { ok: true, stage }
  })
}
