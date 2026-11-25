import { ChartLegend } from "@/components/Charts/ChartLegend"

import { LEGEND } from "@/constants/components/report/sections/vs-benchmark-section"
import { formatPercent } from "@/lib/format"
import { growthRows } from "@/lib/report/performance"
import type { Report } from "@/types/report"

import { GrowthChart } from "../charts/GrowthChart"
import { ReportSection, SectionIntro } from "../ReportSection"

export function VsBenchmarkSection({ report: { performance, periods } }: { report: Report }) {
  const [built, held] = periods
  const rows = [
    { label: "This strategy", values: periods.map(({ portfolio }) => portfolio) },
    { label: "S&P 500", values: periods.map(({ benchmark }) => benchmark) },
  ]

  return (
    <ReportSection title="Vs. S&P 500">
      <SectionIntro>
        Yes, before and after the period it was built on. In the last 12 months, which the strategy never saw, it made{" "}
        {held &&
          `${formatPercent(held.portfolio, { signed: true })} vs ${formatPercent(held.benchmark, { signed: true })}`}
        .
      </SectionIntro>
      <ChartLegend items={LEGEND} />
      <GrowthChart rows={growthRows(performance)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[13px]">
          <thead>
            <tr className="text-ink-400 text-xs font-medium">
              <th scope="col" className="pr-2 pb-2 text-left font-medium">
                <span className="sr-only">Strategy</span>
              </th>
              {periods.map(({ label }) => (
                <th key={label} scope="col" className="pr-2 pb-2 text-right font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, values }) => (
              <tr key={label} className="border-border-secondary dark:border-border-tertiary border-t">
                <td className="py-2.5 pr-2 text-left">{label}</td>
                {values.map((value, i) => (
                  <td key={periods[i]?.label} className="py-2.5 pr-2 text-right tabular-nums">
                    {formatPercent(value, { signed: true })}
                    {i === 0 && built ? " a year" : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-400 text-xs">Share prices, monthly rebalance, 0.3% costs and 0.1% slippage per trade.</p>
    </ReportSection>
  )
}
