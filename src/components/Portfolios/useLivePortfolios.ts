"use client"

import { useMemo } from "react"

import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import type { Portfolio } from "@/lib/portfolios/types"
import { markToMarket } from "@/lib/portfolios/valuation"

// The portfolios at the prices the market is making right now: every stock held is worth its units at the pool's latest
// price, so what each model is worth and has gained moves with each trade. `addresses` is each stock's contract on Base.
export function useLivePortfolios(portfolios: Portfolio[], addresses: Record<string, string>) {
  const { quotes } = useLiveMarketContext()

  return useMemo(() => {
    const prices = Object.entries(addresses).flatMap(([symbol, address]) => {
      const price = quotes[address.toLowerCase()]?.price
      return price ? [{ symbol, price }] : []
    })
    return portfolios.map((portfolio) => markToMarket(portfolio, prices))
  }, [portfolios, addresses, quotes])
}
