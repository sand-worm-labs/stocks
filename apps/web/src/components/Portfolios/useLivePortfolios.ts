"use client"

import { useMemo } from "react"

import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { markToMarket } from "@/lib/portfolios/valuation"
import type { Portfolio } from "@/types/portfolios"

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
