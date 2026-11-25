import { DRAFT_STAGE } from "@/constants/portfolio"
import { getActivity } from "@/lib/activity/source"
import { getBenchmarks } from "@/lib/benchmarks/source"
import { getStocks } from "@/lib/markets/source"
import { isBuyable } from "@/lib/markets/stock"
import { getBaseTokens } from "@/lib/markets/tokens"
import { getStarters } from "@/lib/onboarding/source"
import { getChartData } from "@/lib/portfolios/chart"
import { exposureTo, heldSymbols, isLive, rankByValue } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"

import type { AttentionItem, LiveStock } from "@/types/home"
import type { Stock } from "@/types/markets"
import type { Portfolio } from "@/types/portfolios"

const POPULAR_COUNT = 5
const HELD_COUNT = 6

const heldValue = (portfolios: Portfolio[], symbol: string) =>
  exposureTo(portfolios, symbol).reduce((sum, { value }) => sum + value, 0)

export async function getHome() {
  const [portfolios, stocks, activity, starters, benchmarks, tokens] = await Promise.all([
    getPortfolios(),
    getStocks(),
    getActivity(),
    getStarters(),
    getBenchmarks(),
    getBaseTokens().catch(() => []),
  ])
  const addressOf = new Map(tokens.map(({ symbol, address }) => [symbol, address]))
  const chart = await getChartData(portfolios, benchmarks).catch(() => undefined)
  const totalHeld = portfolios
    .filter(isLive)
    .reduce((sum, { holdings }) => sum + holdings.reduce((s, holding) => s + holding.value, 0), 0)
  const withAddress = (stock: Stock): LiveStock => {
    const exposure = exposureTo(portfolios, stock.symbol)
    const held = exposure.reduce((sum, { value }) => sum + value, 0)
    return {
      ...stock,
      address: addressOf.get(stock.symbol),
      heldIn: exposure.length || undefined,
      share: totalHeld && held ? held / totalHeld : undefined,
    }
  }
  const held = heldSymbols(portfolios)
  const live = portfolios.filter(isLive)
  const [biggest] = rankByValue(portfolios)
  const cap = biggest ? (maxWeightOf((await getRules(biggest)).rules) ?? 1) : 1

  return {
    attention: portfolios
      .filter(({ status }) => status === "draft")
      .map(
        ({ id, name, stage }): AttentionItem => ({
          id,
          title: name,
          detail: DRAFT_STAGE[stage ?? "rules"].detail,
          action: { label: "Continue", route: "portfolio", slug: id },
        })
      ),
    portfolios,
    chart,
    activity: portfolios.length ? activity.slice(0, 4) : [],
    heldStocks: stocks
      .filter(({ symbol }) => held.has(symbol))
      .sort((a, b) => heldValue(portfolios, b.symbol) - heldValue(portfolios, a.symbol))
      .slice(0, HELD_COUNT)
      .map(withAddress),
    addresses: Object.fromEntries(
      [...held].flatMap((symbol) => {
        const address = addressOf.get(symbol)
        return address ? [[symbol, address]] : []
      })
    ),
    hasBought: live.length > 0,
    addFunds: biggest ? { portfolios: rankByValue(portfolios), cap } : undefined,
    starters,
    benchmarks,
    popularStocks: stocks
      .filter(isBuyable)
      .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))
      .slice(0, POPULAR_COUNT)
      .map(withAddress),
  }
}
