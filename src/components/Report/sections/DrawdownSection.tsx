import { LineChart } from "@/components/LineChart/LineChart"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

export function DrawdownSection({ report: { performance, drawdown } }: { report: Report }) {
  const outcomes = [
    { label: "Bad year (1 in 20)", term: "5th percentile", value: drawdown.bad },
    { label: "Middle", term: "Median", value: drawdown.median },
    { label: "Good year (1 in 20)", term: "95th percentile", value: drawdown.good },
  ]

  return (
    <ReportSection title="How bad can it get?" term="Drawdown">
      <p className="text-sm">{drawdown.text}</p>
      <LineChart
        label="How far below its peak the portfolio was"
        lines={[{ id: "underwater", points: performance.underwater, className: "text-red-600" }]}
      />
      <div>
        <h4 className="text-sm font-medium">
          Range of outcomes over the next year <span className="text-ink-400 text-xs font-normal">Monte Carlo</span>
        </h4>
        <dl className="mt-2 grid grid-cols-3 gap-3">
          {outcomes.map(({ label, term, value }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-ink-400 text-xs">
                {label} <span>{term}</span>
              </dt>
              <dd className="text-lg font-medium tabular-nums">{formatPercent(value, { signed: true })}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ReportSection>
  )
}
