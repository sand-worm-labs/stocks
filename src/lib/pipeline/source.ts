import { reportMockData } from "@/_mockdata/reports"
import { getCategories, getStocks } from "@/lib/markets/source"

import type { Market, Pipeline } from "@/types/pipeline"
import { createLocalPipeline } from "./local"

// The agent the app uses. It is the local stand-in until Sandworm's is connected: return that here instead (see `Pipeline`).
export const getPipeline = (): Pipeline => createLocalPipeline(reportMockData[1])

export async function getMarket(): Promise<Market> {
  const [stocks, categories] = await Promise.all([getStocks(), getCategories()])
  return { stocks, categories }
}
