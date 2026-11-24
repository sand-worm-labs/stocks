import { z } from "zod"

import { respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

const body = z.object({ name: z.string().min(1).max(200) })

type Context = { params: Promise<{ id: string }> }

export const PATCH = async (request: Request, { params }: Context) =>
  respond(request, body, async (ownerId, { name }) => ({
    name: (await getStrategyService().rename(ownerId, (await params).id, name)).name,
  }))
