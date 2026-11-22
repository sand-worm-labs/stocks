import { activityMockData } from "@/_mockdata/activity"

import type { Activity } from "./types"

// Newest first
export async function getActivity(): Promise<Activity[]> {
  return activityMockData
}
