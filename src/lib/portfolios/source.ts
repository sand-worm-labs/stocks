import { cache } from "react"

import { buildPortfoliosMockData } from "@/_mockdata/portfolios"
import { getModelCount } from "@/lib/demo/source"
import { toPortfolio } from "@/lib/strategies/portfolio"
import { getOwnStrategies } from "@/lib/strategies/source"

import type { Portfolio } from "./types"

// The strategies as they were bought: the ones this person has made, newest first, then the made-up ones that show the app at any size
// (their number is a setting). What each is worth now is the browser's to work out, at the market's live prices (see
// useLivePortfolios), so it moves as the market does. One read for the render, so the page and the layout share it.
export const getPortfolios = cache(async (): Promise<Portfolio[]> => {
  const [own, demo] = await Promise.all([getOwnStrategies(), getModelCount()])
  return [...own.map(toPortfolio), ...buildPortfoliosMockData(demo)]
})

export async function getPortfolio(id: string) {
  return (await getPortfolios()).find((portfolio) => portfolio.id === id)
}
