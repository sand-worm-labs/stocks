import { Card } from "@/components/ui/card"
import { formatMetric } from "@/lib/report/format"
import type { Metric } from "@/lib/report/types"

function note({ benchmark, was, note, kind }: Metric) {
  if (benchmark !== undefined) return `S&P 500 ${formatMetric({ value: benchmark, kind })}`
  if (was !== undefined) return `was ${formatMetric({ value: was, kind })}`
  return note
}

export function MetricTiles({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.id} className="flex flex-col gap-1 p-4">
          <span className="text-ink-400 text-sm">
            {metric.label} <span className="text-xs">{metric.term}</span>
          </span>
          <span className="text-2xl font-medium tabular-nums">{formatMetric(metric)}</span>
          <span className="text-ink-400 text-xs">{note(metric)}</span>
        </Card>
      ))}
    </div>
  )
}
