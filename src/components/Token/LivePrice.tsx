"use client"

import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Money } from "@/components/Money/Money"

export function LivePrice({ address, initial }: { address: string; initial: number }) {
  const { quotes } = useLiveMarketContext()
  const price = quotes[address.toLowerCase()]?.price ?? initial

  return (
    <Flash value={price}>
      <span className="text-3xl font-medium tabular-nums md:text-4xl">
        <Money value={price} />
      </span>
    </Flash>
  )
}
