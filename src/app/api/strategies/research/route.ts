import { respond } from "@/lib/api/respond"
import { getStore } from "@/lib/store"
import { getStrategyService } from "@/lib/strategies/source"

const isResearching = ({ status, stage }: { status: string; stage?: string }) =>
  status === "draft" && (stage === "researching" || stage === "ready")

export async function GET(request: Request) {
  return respond(request, {}, async ({ ownerId }) => {
    const service = getStrategyService()
    const records = await getStore().list(ownerId)
    const strategies = await Promise.all(records.map((record) => service.settle(record)))

    return {
      strategies: strategies.filter(isResearching).map(({ id, name, stage }) => ({ id, name, stage })),
    }
  })
}
