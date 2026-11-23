import { cache } from "react"

import { buildPortfoliosMockData } from "@/_mockdata/portfolios"
import { getModelCount } from "@/lib/demo/source"

import type { Portfolio } from "./types"

// The portfolios as they were bought. What each is worth now is the browser's to work out, at the market's live prices
// (see useLivePortfolios), so it moves as the market does. One read for the render, so the page and the layout share it.
export const getPortfolios = cache(async (): Promise<Portfolio[]> => buildPortfoliosMockData(await getModelCount()))

export async function getPortfolio(id: string) {
  return (await getPortfolios()).find((portfolio) => portfolio.id === id)
}
