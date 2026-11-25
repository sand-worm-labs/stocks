import { Money } from "@/components/Money/Money"
import { TokenLineChart } from "@/components/TokenLineChart/TokenLineChart"
import { Card } from "@/components/ui/card"
import { SERIES_STEP_SECONDS } from "@/constants/components/token/token-analytics"
import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { BaseToken } from "@/lib/markets/tokens"

import { FactList } from "./FactList"

export function TokenAnalytics({ token, liquidity }: { token: BaseToken; liquidity?: number }) {
  const { symbol, series, marketCap, volume, change7d } = token
  const low = Math.min(...series)
  const high = Math.max(...series)
  const ratio = (top?: number, bottom?: number) => (top !== undefined && bottom ? formatPercent(top / bottom) : "—")

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Price, last 7 days</h2>
          <span className="text-ink-400 text-sm">
            <Money value={low} /> to <Money value={high} />
          </span>
        </div>
        <TokenLineChart
          label={`${symbol} price over the last 7 days`}
          series={series}
          stepSeconds={SERIES_STEP_SECONDS}
          tone={(change7d ?? 0) < 0 ? "negative" : "positive"}
          className="h-72"
        />
      </Card>
      <FactList
        title="Turnover and depth"
        rows={[
          { label: "Volume against market cap", value: ratio(volume, marketCap) },
          { label: "Liquidity against market cap", value: ratio(liquidity, marketCap) },
          { label: "Pool liquidity", value: liquidity === undefined ? "—" : formatCompactUsd(liquidity) },
          { label: "Range this week", value: `${formatPercent(low ? high / low - 1 : 0)} from low to high` },
        ]}
      />
    </div>
  )
}
