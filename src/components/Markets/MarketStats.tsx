import { Card } from "@/components/ui/card"
import { formatCompactUsd } from "@/lib/format"
import { marketStats } from "@/lib/markets/tokens"
import type { BaseToken } from "@/lib/markets/tokens"

export function MarketStats({ tokens }: { tokens: BaseToken[] }) {
  const { count, marketCap, volume, issuers } = marketStats(tokens)

  const stats = [
    { label: "Tokenized stocks on Base", value: count.toLocaleString("en-US"), caption: "Listed with a live price" },
    { label: "Market cap", value: formatCompactUsd(marketCap), caption: "All of them together" },
    { label: "Volume, 24h", value: formatCompactUsd(volume), caption: "Traded in the last day" },
    { label: "Issuers", value: String(issuers), caption: "Companies that issue the tokens" },
  ]

  return (
    <Card className="grid grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border-border-secondary dark:border-border-tertiary flex flex-col gap-1 p-4 not-[:nth-child(-n+2)]:border-t md:p-5 lg:not-first:border-l lg:not-[:nth-child(-n+2)]:border-t-0 max-lg:[&:nth-child(2n)]:border-l"
        >
          <span className="text-ink-400 text-sm">{stat.label}</span>
          <span className="text-xl font-medium tabular-nums md:text-2xl">{stat.value}</span>
          <span className="text-ink-400 truncate text-xs">{stat.caption}</span>
        </div>
      ))}
    </Card>
  )
}
