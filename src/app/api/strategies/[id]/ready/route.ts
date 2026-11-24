import { respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// The research is done and its results are to be shown
export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  respond(request, undefined, async (ownerId) => {
    const { stage } = await getStrategyService().finishResearch(ownerId, (await params).id)
    return { stage }
  })
