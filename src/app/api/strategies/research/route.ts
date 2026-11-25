import { respond } from "@/lib/api/respond"
import { getStore } from "@/lib/store"
import { getStrategyService } from "@/lib/strategies/source"

export const GET = (request: Request) =>
  respond(request, undefined, async (ownerId) => {
    const service = getStrategyService()
    const strategies = await Promise.all((await getStore().list(ownerId)).map((record) => service.settle(record)))

    return {
      strategies: strategies
        .filter(({ status, stage }) => status === "draft" && (stage === "researching" || stage === "ready"))
        .map(({ id, name, stage }) => ({ id, name, stage })),
    }
  })
