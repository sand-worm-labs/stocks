import { z } from "zod"

import { respond } from "@/lib/api/respond"
import { BRIEF_MAX_LENGTH } from "@/lib/strategies/service"
import { getStrategyService } from "@/lib/strategies/source"
import { listed } from "@/lib/strategies/view"

const createSchema = z.object({ brief: z.string().min(1).max(BRIEF_MAX_LENGTH) })

// Everything this person has made, newest first
export async function GET(request: Request) {
  return respond(request, {}, async ({ ownerId }) => (await getStrategyService().list(ownerId)).map(listed))
}

export async function POST(request: Request) {
  return respond(request, { body: createSchema, status: 201 }, async ({ ownerId, body }) => {
    const { id } = await getStrategyService().create(ownerId, body.brief)
    return { id }
  })
}
