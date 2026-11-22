import { SourceLink } from "@/components/SourceLink/SourceLink"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { Card } from "@/components/ui/card"
import { formatAsOf } from "@/lib/dates"
import { formatPercent } from "@/lib/format"
import type { MarketSummary } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"

export function ValueCard({ portfolio, summary }: { portfolio: Portfolio; summary: MarketSummary }) {
  const { weekChange = 0, worstDip = 0, series } = portfolio

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <span className="text-ink-400 text-sm">Value</span>
        <h3 className="text-lg font-medium">
          {weekChange >= 0 ? "Up" : "Down"} {formatPercent(Math.abs(weekChange))} in a week, worst dip{" "}
          {formatPercent(worstDip, { signed: true })}.
        </h3>
      </div>
      <Sparkline series={series} className="text-primary h-32 w-full" />
      <p className="text-ink-400 text-xs">
        Data <SourceLink {...summary.source} /> · as of {formatAsOf(summary.asOf)}
      </p>
    </Card>
  )
}
