import { z } from "zod"

import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { report } from "@/lib/strategies/view"

const renameSchema = z.object({ name: z.string().min(1).max(200) })

// All of a strategy as its owner sees it: where it is, what research found, what it holds
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params
  return respond(request, {}, async ({ ownerId }) => report(await getStrategyService().owned(ownerId, id)))
}

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: renameSchema }, async ({ ownerId, body }) => {
    const { name } = await getStrategyService().rename(ownerId, id, body.name)
    return { name }
  })
}
