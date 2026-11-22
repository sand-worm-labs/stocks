import { ChartLegend } from "@/components/Charts/ChartLegend"
import { CHART_COLORS } from "@/constants/chart"
import { formatPercent } from "@/lib/format"
import { drawdownRows } from "@/lib/report/performance"
import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"

import { DrawdownChart } from "../charts/DrawdownChart"
import { FanChart } from "../charts/FanChart"
import { ReportSection, SectionIntro } from "../ReportSection"

export function DrawdownSection({ report: { performance, drawdown, tolerance } }: { report: Report }) {
  const outcomes = [
    { label: "Bad year (1 in 20)", value: drawdown.bad, className: "text-red-700 dark:text-red-400" },
    { label: "Middle", value: drawdown.median, className: "" },
    { label: "Good year (1 in 20)", value: drawdown.good, className: "text-emerald-700 dark:text-emerald-400" },
  ]

  return (
    <ReportSection title="Downside">
      <SectionIntro>{drawdown.text}</SectionIntro>
      <ChartLegend
        items={[
          { label: "This portfolio", color: CHART_COLORS.negative },
          { label: "S&P 500", color: CHART_COLORS.muted, dashed: true },
          { label: "You'd panic", color: CHART_COLORS.warning, dashed: true },
        ]}
      />
      <DrawdownChart rows={drawdownRows(performance)} panic={tolerance.panic} />
      <h4 className="mt-1.5 text-sm font-medium">Range of outcomes over the next year</h4>
      <ChartLegend
        items={[
          { label: "Middle outcome", color: CHART_COLORS.primary },
          { label: "9 in 10 outcomes", color: "hsl(var(--primary) / 0.25)" },
        ]}
      />
      <FanChart fan={drawdown.fan} />
      <dl className="grid grid-cols-3 gap-3">
        {outcomes.map(({ label, value, className }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-ink-400 text-xs">{label}</dt>
            <dd className={cn("text-[19px] font-medium tabular-nums", className)}>
              {formatPercent(value, { signed: true })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-ink-400 text-xs leading-[18px]">{drawdown.note}</p>
    </ReportSection>
  )
}
