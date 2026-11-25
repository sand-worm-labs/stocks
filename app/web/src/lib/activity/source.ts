import { activityMockData } from "@/_mockdata/activity"
import { getModelCount } from "@/lib/demo/source"
import { getOwnStrategies } from "@/lib/strategies/source"
import type { Activity } from "@/types/activity"

import { activityOf } from "./own"

export async function getActivity(portfolioId?: string): Promise<Activity[]> {
  const [strategies, demo] = await Promise.all([getOwnStrategies(), getModelCount()])
  const own = strategies.flatMap(activityOf)
  // Made-up activity belongs with the made-up strategies, and is there only when they are
  const all = [...own, ...(demo > 0 ? activityMockData : [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return portfolioId ? all.filter((event) => event.portfolioId === portfolioId) : all
}
