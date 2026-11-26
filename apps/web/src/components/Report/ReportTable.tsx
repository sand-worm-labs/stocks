import type { ComponentProps } from "react"

import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// The app's table, framed for a report: one hairline border and rounded corners in light and dark alike, a tinted header, and cells that are
// less tall than a page's, since a report's tables are short and sit inside a card.
export function ReportTable({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-xl border [&_[data-slot=table-container]]:rounded-none [&_[data-slot=table-container]]:border-0">
      <Table className={className} {...props} />
    </div>
  )
}

export function ReportTableHead({ className, ...props }: ComponentProps<"th">) {
  return <TableHead className={cn("bg-inputBg px-4 py-2.5 text-[11px] font-medium tracking-wide dark:bg-white/5", className)} {...props} />
}

export function ReportTableCell({ className, ...props }: ComponentProps<"td">) {
  return <TableCell className={cn("px-4 py-3 text-sm", className)} {...props} />
}

export const ReportTableRow = TableRow
