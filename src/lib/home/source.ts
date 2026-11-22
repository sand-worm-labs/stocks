import { attentionMockData, ideasMockData } from "@/_mockdata/home"
import { getActivity } from "@/lib/activity/source"
import { getStocks } from "@/lib/markets/source"
import { heldSymbols } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"

import { buildKpis } from "./kpis"

export async function getHome() {
  const [portfolios, stocks, activity] = await Promise.all([getPortfolios(), getStocks(), getActivity()])
  const held = heldSymbols(portfolios)

  return {
    kpis: buildKpis(portfolios),
    attention: attentionMockData,
    portfolios,
    activity: activity.slice(0, 4),
    heldStocks: stocks.filter(({ symbol }) => held.has(symbol)),
    ideas: ideasMockData,
  }
}
