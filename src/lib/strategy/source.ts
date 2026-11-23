import { sampleStrategyMockData } from "@/_mockdata/strategies"

import type { Strategy } from "./types"

// The strategy a portfolio runs. Every one has the same sample until each has its own.
export async function getStrategy(): Promise<Strategy> {
  return sampleStrategyMockData
}
