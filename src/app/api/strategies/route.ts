import { z } from "zod"

import { respond } from "@/lib/api/respond"
import { BRIEF_MAX_LENGTH } from "@/lib/strategies/service"
import { getStrategyService } from "@/lib/strategies/source"

const body = z.object({ brief: z.string().min(1).max(BRIEF_MAX_LENGTH) })

export const POST = (request: Request) =>
  respond(
    request,
    body,
    async (ownerId, { brief }) => ({ id: (await getStrategyService().create(ownerId, brief)).id }),
    201
  )
