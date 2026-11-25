import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"
import { brief } from "@/lib/strategies/view"

// What was asked for and the rules it was turned into, with how the report should come out: what research is built to
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params
  return respond(request, {}, async ({ ownerId }) => brief(await getStrategyService().owned(ownerId, id)))
}
