import { after } from "next/server"

import { type IdParams, respond } from "@/lib/api/respond"
import { getSandwormToken } from "@/lib/auth/sandworm-token"
import { getStrategyService } from "@/lib/strategies/source"

// The research can take minutes, and runs after the answer is sent
export const maxDuration = 300

// Starts research that has stopped over again
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, {}, async ({ ownerId }) => {
    const service = getStrategyService()
    // Read now: after the answer is sent the request's cookies are no longer there to read
    const sandwormToken = await getSandwormToken()
    const { stage } = await service.retryResearch(ownerId, id, { sandwormToken })
    after(() => service.produce(ownerId, id, { sandwormToken }))
    return { stage }
  })
}
