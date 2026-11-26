import { activityOf } from "@/lib/activity/own"
import { respond } from "@/lib/api/respond"
import { getStrategyService } from "@/lib/strategies/source"

// What has happened to all of this person's strategies, newest first
export async function GET(request: Request) {
  return respond(request, {}, async ({ ownerId }) => {
    const strategies = await getStrategyService().list(ownerId)
    return strategies.flatMap(activityOf).toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at))
  })
}
