import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, {}, async ({ ownerId }) => {
    const { stage } = await getStrategyService().confirmRules(ownerId, id)
    return { stage }
  })
}
