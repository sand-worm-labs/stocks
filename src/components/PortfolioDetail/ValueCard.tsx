import { TradingChart } from "@/components/Charts/TradingChart"
import { Card } from "@/components/ui/card"
import { benchmarkLines } from "@/lib/benchmarks/compare"
import type { Benchmark } from "@/lib/benchmarks/types"
import { formatPercent } from "@/lib/format"
import { holdPeriod, valueOverWeek } from "@/lib/portfolios/performance"
import type { Portfolio } from "@/lib/portfolios/types"

type ValueCardProps = { portfolio: Portfolio; benchmarks: Benchmark[]; now: string }

export function ValueCard({ portfolio, benchmarks, now }: ValueCardProps) {
  const { weekChange = 0, worstDip = 0 } = portfolio
  const points = valueOverWeek(portfolio, now)

  return (
    <Card className="flex flex-col gap-3.5 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <h3 className="text-[17px] font-medium">
        {weekChange >= 0 ? "Up" : "Down"} {formatPercent(Math.abs(weekChange))} {holdPeriod(portfolio, now).text}, worst
        dip {formatPercent(worstDip, { signed: true })}.
      </h3>
      <TradingChart
        points={points}
        lines={benchmarkLines(benchmarks, points)}
        label="The value of the strategy over the last week, against index funds and ETFs"
      />
    </Card>
  )
}
