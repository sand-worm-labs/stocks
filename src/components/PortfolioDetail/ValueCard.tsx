import { ChartLegend } from "@/components/Charts/ChartLegend"
import { SourceList } from "@/components/SourceLink/SourceList"
import { Card } from "@/components/ui/card"
import { CHART_COLORS } from "@/constants/chart"
import { formatPercent } from "@/lib/format"
import type { MarketSummary } from "@/lib/markets/types"
import { holdPeriod, valueOverWeek } from "@/lib/portfolios/performance"
import type { Portfolio } from "@/lib/portfolios/types"

import { ValueChart } from "./ValueChart"

type ValueCardProps = { portfolio: Portfolio; summary: MarketSummary; now: string }

export function ValueCard({ portfolio, summary, now }: ValueCardProps) {
  const { weekChange = 0, worstDip = 0 } = portfolio
  const points = valueOverWeek(portfolio, now)

  return (
    <Card className="flex flex-col gap-3.5 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-medium">
          {weekChange >= 0 ? "Up" : "Down"} {formatPercent(Math.abs(weekChange))} {holdPeriod(portfolio, now).text},
          worst dip {formatPercent(worstDip, { signed: true })}.
        </h3>
        <ChartLegend
          items={[
            { label: "Portfolio", color: CHART_COLORS.primary },
            { label: "S&P 500", color: CHART_COLORS.muted, dashed: true },
          ]}
        />
      </div>
      <ValueChart points={points} />
      <SourceList sources={[summary.source]} asOf={summary.asOf} />
    </Card>
  )
}
