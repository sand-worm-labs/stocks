"use client"

import { Change } from "@/components/Markets/Change"
import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import type { BaseToken } from "@/lib/markets/tokens"

const toFraction = (percent?: number) => (percent === undefined ? undefined : percent / 100)

// The moves over the last five minutes, hour, day and week, the first three from the pool as it trades
export function LiveChanges({ token: { address, change1h, change24h, change7d } }: { token: BaseToken }) {
  const pool = useLiveMarketContext().quotes[address.toLowerCase()]

  const changes = [
    { label: "5m", value: toFraction(pool?.change5m) },
    { label: "1h", value: toFraction(pool?.change1h) ?? change1h },
    { label: "24h", value: toFraction(pool?.change24h) ?? change24h },
    { label: "7d", value: change7d },
  ]

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {changes.map(({ label, value }) => (
        <li
          key={label}
          className="border-border-secondary dark:border-border-tertiary flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
        >
          <span className="text-ink-400">{label}</span>
          <Flash value={value}>
            <Change value={value} />
          </Flash>
        </li>
      ))}
    </ul>
  )
}
