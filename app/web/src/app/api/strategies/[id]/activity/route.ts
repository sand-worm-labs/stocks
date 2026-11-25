import { activityOf } from "@/lib/activity/own"
import { type IdParams, respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// What has happened to one strategy, newest first
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params
  return respond(request, {}, async ({ ownerId }) => activityOf(await getStrategyService().owned(ownerId, id)).toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at)))
}
