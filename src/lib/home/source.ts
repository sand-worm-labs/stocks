import { DRAFT_STAGE } from "@/constants/portfolio"
import { getActivity } from "@/lib/activity/source"
import { getBenchmarks } from "@/lib/benchmarks/source"
import { getStocks } from "@/lib/markets/source"
import { isBuyable } from "@/lib/markets/stock"
import { getBaseTokens } from "@/lib/markets/tokens"
import type { Stock } from "@/lib/markets/types"
import { getStarters } from "@/lib/onboarding/source"
import { getChartData } from "@/lib/portfolios/chart"
import { exposureTo, heldSymbols, isLive, rankByValue } from "@/lib/portfolios/portfolio"
import { getPortfolios } from "@/lib/portfolios/source"
import type { Portfolio } from "@/lib/portfolios/types"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"

import type { AttentionItem, LiveStock } from "./types"

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
  // The value over time, worked out from real prices; without it (the feed can't be reached) the chart is drawn the old way
  const chart = await getChartData(portfolios, benchmarks).catch(() => undefined)
  const totalHeld = portfolios
    .filter(isLive)
    .reduce((sum, { holdings }) => sum + holdings.reduce((s, holding) => s + holding.value, 0), 0)
  // Where a stock is held: in how many models, and how much of everything held in stocks it is
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
  // Money can go into any live portfolio, the biggest first; the cap is the rules' (the same for each, while rules are made up)
  const [biggest] = rankByValue(portfolios)
  const cap = biggest ? (maxWeightOf((await getRules(biggest)).rules) ?? 1) : 1

  return {
    // The drafts not finished, to carry on with
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
    // The biggest holdings first, as far as the side of the page has room for
    heldStocks: stocks
      .filter(({ symbol }) => held.has(symbol))
      .sort((a, b) => heldValue(portfolios, b.symbol) - heldValue(portfolios, a.symbol))
      .slice(0, HELD_COUNT)
      .map(withAddress),
    // Each stock held, and its contract on Base, to read its price from
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
