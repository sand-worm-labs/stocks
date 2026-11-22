import { LineChart } from "@/components/LineChart/LineChart"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

export function PeriodsSection({ report: { performance, periods } }: { report: Report }) {
  return (
    <ReportSection title="Does it beat just holding?" term="vs benchmark">
      <p className="text-sm">
        Yes, before and after the period it was built on. In the last 12 months, which the strategy never saw, it did
        better.
      </p>
      <ul className="text-ink-400 flex gap-4 text-sm">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-primary h-0.5 w-4 rounded-full" />
          This portfolio
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="border-ink-300 w-4 border-t-2 border-dashed" />
          S&amp;P 500
        </li>
      </ul>
      <LineChart
        label="Growth of the portfolio against the S&P 500"
        lines={[
          { id: "benchmark", points: performance.benchmark, className: "text-ink-300", dashed: true },
          { id: "portfolio", points: performance.portfolio, className: "text-primary" },
        ]}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="sr-only">Portfolio</span>
            </TableHead>
            {periods.map(({ label, term }) => (
              <TableHead key={label}>
                {label} <span className="font-normal">{term}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <tbody>
          <TableRow>
            <TableCell>This portfolio</TableCell>
            {periods.map(({ label, portfolio }) => (
              <TableCell key={label} className="tabular-nums">
                {formatPercent(portfolio, { signed: true })} a year
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell>S&amp;P 500</TableCell>
            {periods.map(({ label, benchmark }) => (
              <TableCell key={label} className="tabular-nums">
                {formatPercent(benchmark, { signed: true })} a year
              </TableCell>
            ))}
          </TableRow>
        </tbody>
      </Table>
      <p className="text-ink-400 text-xs">
        Share prices, rebalanced monthly, after fees, the bid-ask spread and slippage.
      </p>
    </ReportSection>
  )
}
