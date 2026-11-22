"use client"

import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { formatUsd } from "@/lib/format"

// The token's price in its pool, moving on each trade
export function LivePrice({ address, initial }: { address: string; initial: number }) {
  const { quotes } = useLiveMarketContext()
  const price = quotes[address.toLowerCase()]?.price ?? initial

  return (
    <Flash value={price}>
      <span className="text-3xl font-medium tabular-nums md:text-4xl">{formatUsd(price)}</span>
    </Flash>
  )
}
