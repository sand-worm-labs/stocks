"use client"

import { createContext, type ReactNode, useContext } from "react"

import { useLiveMarket } from "@/hooks/use-live-market"
import type { PoolQuote } from "@/lib/markets/pools"

const LiveMarketContext = createContext<ReturnType<typeof useLiveMarket> | undefined>(undefined)

// One connection to the market for everything on the page that moves
export function LiveMarketProvider({ children, initialPools }: { children: ReactNode; initialPools?: PoolQuote[] }) {
  return <LiveMarketContext value={useLiveMarket(initialPools)}>{children}</LiveMarketContext>
}

export function useLiveMarketContext() {
  const context = useContext(LiveMarketContext)
  if (!context) throw new Error("Live market data is only there inside a LiveMarketProvider")

  return context
}
