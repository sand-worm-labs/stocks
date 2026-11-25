import { type IdParams, respond } from "@/lib/api/respond"
import { signReportShare } from "@/lib/auth/token"
import { StrategyError } from "@/lib/strategies/service"
import { getStrategyService } from "@/lib/strategies/source"

// A link anyone can open to read this strategy's report. Only for a strategy that has one, and only its owner can make it.
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, {}, async ({ ownerId }) => {
    const { research } = await getStrategyService().owned(ownerId, id)
    if (!research?.result) throw new StrategyError("There is no report to share yet", 409)
    const token = await signReportShare(id)
    return { url: `${new URL(request.url).origin}/share/${token}` }
  })
}
