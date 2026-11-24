import { TradingChart } from "@/components/Charts/TradingChart"
import { Card } from "@/components/ui/card"
import { benchmarkLines } from "@/lib/benchmarks/compare"
import type { Benchmark } from "@/lib/benchmarks/types"
import { formatPercent } from "@/lib/format"
import type { ChartData } from "@/lib/portfolios/chart"
import { withLiveEnd } from "@/lib/portfolios/history"
import { holdPeriod, valueOverWeek } from "@/lib/portfolios/performance"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"

// `chart` holds the real prices this strategy's line is worked out from; without it, the line is the made-up one
type ValueCardProps = { portfolio: Portfolio; benchmarks: Benchmark[]; now: string; chart?: ChartData }

export function ValueCard({ portfolio, benchmarks, now, chart }: ValueCardProps) {
  const { weekChange = 0, worstDip = 0 } = portfolio
  const real = chart?.histories[portfolio.id]
  const points = real
    ? withLiveEnd(real, portfolioValue(portfolio) ?? 0, new Date(now).getTime())
    : valueOverWeek(portfolio, now)

  return (
    <Card className="flex flex-col gap-3.5 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <h3 className="text-[17px] font-medium">
        {weekChange >= 0 ? "Up" : "Down"} {formatPercent(Math.abs(weekChange))} {holdPeriod(portfolio, now).text}, worst
        dip {formatPercent(worstDip, { signed: true })}.
      </h3>
      <TradingChart
        points={points}
        lines={benchmarkLines(benchmarks, points, real ? chart?.funds : undefined)}
        events={real ? chart?.events : undefined}
        label="The value of the strategy over the last week, against index funds and ETFs"
      />
    </Card>
  )
}
