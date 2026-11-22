import type { ReactNode } from "react"

import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

type ComparisonSectionProps = { comparison: NonNullable<Report["comparison"]>; actions?: ReactNode }

export function ComparisonSection({ comparison, actions }: ComparisonSectionProps) {
  return (
    <ReportSection title="Does it still beat just holding?">
      <p className="text-sm">Yes, by less: +21.4% a year vs +17.2% for the S&amp;P 500, with similar drops.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="sr-only">Measure</span>
            </TableHead>
            <TableHead>Before</TableHead>
            <TableHead>Less risk</TableHead>
          </TableRow>
        </TableHeader>
        <tbody>
          {comparison.map(({ label, term, before, after }) => (
            <TableRow key={label}>
              <TableCell>
                {label} {term && <span className="text-ink-400 text-xs">{term}</span>}
              </TableCell>
              <TableCell className="tabular-nums">{before}</TableCell>
              <TableCell className="font-medium tabular-nums">{after}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </ReportSection>
  )
}
