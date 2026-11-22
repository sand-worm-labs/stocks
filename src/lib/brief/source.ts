import { briefMockData } from "@/_mockdata/briefs"

import type { BriefReview } from "./types"

export async function getBriefReview(status: BriefReview["status"]): Promise<BriefReview> {
  return briefMockData[status]
}
