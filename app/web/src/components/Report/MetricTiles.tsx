import { Card } from "@/components/ui/card"
import { formatMetric } from "@/lib/report/format"
import { cn } from "@/lib/utils"
import type { Metric } from "@/types/report"

function note({ benchmark, was, note, kind }: Metric) {
  if (benchmark !== undefined) return `S&P 500 ${formatMetric({ value: benchmark, kind })}`
  if (was !== undefined) return `was ${formatMetric({ value: was, kind })}`
  return note
}

export function MetricTiles({ metrics }: { metrics: Metric[] }) {
  return (
    <div data-tour="results-metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric, i) => (
        <Card raised
          key={metric.id}
          style={{ "--index": i } as React.CSSProperties}
          className="animate-fade-up flex flex-col gap-0.5 rounded-[14px] px-[18px] py-4"
        >
          <span className="text-ink-200 text-xs font-medium">{metric.term}</span>
          <span
            className={cn(
              "text-[28px] leading-9 font-medium tabular-nums",
              metric.id === "drawdown" && "text-red-700 dark:text-red-400"
            )}
          >
            {formatMetric(metric)}
          </span>
          <span className="text-ink-400 text-xs">{note(metric)}</span>
        </Card>
      ))}
    </div>
  )
}
