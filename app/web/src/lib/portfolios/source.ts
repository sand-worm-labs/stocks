import { cache } from "react"

import { buildPortfoliosMockData } from "@/_mockdata/portfolios"
import { getModelCount } from "@/lib/demo/source"
import { toPortfolio } from "@/lib/strategies/portfolio"
import { getOwnStrategies } from "@/lib/strategies/source"

import type { Portfolio } from "@/types/portfolios"

export const getPortfolios = cache(async (): Promise<Portfolio[]> => {
  const [own, demo] = await Promise.all([getOwnStrategies(), getModelCount()])
  return [...own.map(toPortfolio), ...buildPortfoliosMockData(demo)]
})

export async function getPortfolio(id: string) {
  return (await getPortfolios()).find((portfolio) => portfolio.id === id)
}
