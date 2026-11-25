import { z } from "zod"

import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

const renameSchema = z.object({ name: z.string().min(1).max(200) })

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: renameSchema }, async ({ ownerId, body }) => {
    const { name } = await getStrategyService().rename(ownerId, id, body.name)
    return { name }
  })
}
