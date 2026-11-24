import { z } from "zod"

import { respond } from "@/lib/api/respond"
import { BRIEF_MAX_LENGTH } from "@/lib/strategies/service"
import { getStrategyService } from "@/lib/strategies/source"

const body = z.object({ brief: z.string().min(1).max(BRIEF_MAX_LENGTH) })

// Makes a strategy from the idea typed, and answers with where to open it
export const POST = (request: Request) =>
  respond(
    request,
    body,
    async (ownerId, { brief }) => ({ id: (await getStrategyService().create(ownerId, brief)).id }),
    201
  )
