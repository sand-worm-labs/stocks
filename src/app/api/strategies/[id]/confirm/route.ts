import { respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// Locks the rules and starts the research
export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  respond(request, undefined, async (ownerId) => {
    const { stage } = await getStrategyService().confirmRules(ownerId, (await params).id)
    return { stage }
  })
