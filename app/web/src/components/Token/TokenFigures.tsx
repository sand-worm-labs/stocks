"use client"

import { Change } from "@/components/Markets/Change"
import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Card } from "@/components/ui/card"
import { formatCompactUsd } from "@/lib/format"
import type { BaseToken } from "@/lib/markets/tokens"

type TokenFiguresProps = { token: BaseToken; total: number }

export function TokenFigures({ token: { address, marketCap, volume, change7d, rank }, total }: TokenFiguresProps) {
  const pool = useLiveMarketContext().quotes[address.toLowerCase()]
  const compact = (value?: number) => (value === undefined ? "—" : formatCompactUsd(value))
  const liveVolume = pool?.volume24h ?? volume

  const figures = [
    { label: "Market cap", value: compact(marketCap), caption: `Number ${rank} of ${total} on Base` },
    {
      label: "Volume, 24h",
      value: (
        <Flash value={liveVolume}>
          <span>{compact(liveVolume)}</span>
        </Flash>
      ),
      caption: "Traded in the last day",
    },
    {
      label: "Liquidity in its pool",
      value: <span>{compact(pool?.liquidity)}</span>,
      caption: "What a trade moves against",
    },
    { label: "Last 7 days", value: <Change value={change7d} />, caption: "Move since last week" },
  ]

  return (
    <Card className="grid grid-cols-2 lg:grid-cols-4">
      {figures.map(({ label, value, caption }) => (
        <div
          key={label}
          className="border-border-secondary dark:border-border-tertiary flex flex-col gap-1 p-4 not-[:nth-child(-n+2)]:border-t md:p-5 lg:not-first:border-l lg:not-[:nth-child(-n+2)]:border-t-0 max-lg:[&:nth-child(2n)]:border-l"
        >
          <span className="text-ink-400 text-sm">{label}</span>
          <span className="text-xl font-medium tabular-nums md:text-2xl">{value}</span>
          <span className="text-ink-400 text-xs">{caption}</span>
        </div>
      ))}
    </Card>
  )
}
