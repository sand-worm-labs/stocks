import { respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { brief } from "@/lib/strategies/view"

// Strategies whose rules are confirmed and that are waiting for someone to do the research and hand it back
export async function GET(request: Request) {
  return respond(request, {}, async ({ ownerId }) => (await getStrategyService().waitingForResearch(ownerId)).map(brief))
}
