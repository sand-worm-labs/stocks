import { activityMockData } from "@/_mockdata/activity"

import type { Activity } from "./types"

// Newest first. Given a portfolio, only what happened to it.
export async function getActivity(portfolioId?: string): Promise<Activity[]> {
  return portfolioId ? activityMockData.filter((event) => event.portfolioId === portfolioId) : activityMockData
}
