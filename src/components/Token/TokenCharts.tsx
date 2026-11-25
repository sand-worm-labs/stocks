"use client"

import { type ReactNode, useState } from "react"

import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { PoolChart } from "./PoolChart"

type TokenChartsProps = {
  address: string
  symbol: string
  other: { label: string; note: string; chart: ReactNode }
}

export function TokenCharts({ address, symbol, other }: TokenChartsProps) {
  const pair = useLiveMarketContext().quotes[address.toLowerCase()]?.pair
  const [tab, setTab] = useState<"token" | "other">(pair ? "token" : "other")

  const tabs = [
    ...(pair
      ? [
          {
            id: "token" as const,
            label: `${symbol} on Base`,
            note: "The token's own candles, a minute each, moving with every swap.",
          },
        ]
      : []),
    { id: "other" as const, label: other.label, note: other.note },
  ]
  const current = tabs.find(({ id }) => id === tab) ?? tabs[0]

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 md:px-6 md:pt-5">
        <div
          role="tablist"
          aria-label="Chart"
          className="border-border-secondary dark:border-border-tertiary flex gap-1 rounded-full border p-1"
        >
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === current?.id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                id === current?.id
                  ? "bg-base-400 text-primary-foreground dark:bg-white dark:text-black"
                  : "text-ink-400 hover:text-ink-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-ink-400 text-sm">{current?.note}</p>
      </div>

      <div className="pt-3">
        {current?.id === "token" && pair ? <PoolChart pair={pair} label={`${symbol} price chart`} /> : other.chart}
      </div>
    </Card>
  )
}
