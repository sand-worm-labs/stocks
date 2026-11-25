import { activityMockData } from "@/_mockdata/activity"
import { getOwnStrategies } from "@/lib/strategies/source"
import type { Activity } from "@/types/activity"

import { activityOf } from "./own"

export async function getActivity(portfolioId?: string): Promise<Activity[]> {
  const own = (await getOwnStrategies()).flatMap(activityOf)
  const all = [...own, ...activityMockData].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return portfolioId ? all.filter((event) => event.portfolioId === portfolioId) : all
}
