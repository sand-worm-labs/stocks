import { portfoliosMockData } from "@/_mockdata/portfolios"

import type { Portfolio } from "./types"

export async function getPortfolios(): Promise<Portfolio[]> {
  return portfoliosMockData
}

export async function getPortfolio(id: string) {
  return (await getPortfolios()).find((portfolio) => portfolio.id === id)
}
