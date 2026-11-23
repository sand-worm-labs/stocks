import type { ReactNode } from "react"

import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { Skeleton, SkeletonAvatar, SkeletonText } from "./Skeleton"

export type SkeletonColumn = {
  // How wide the header's label and the cell's figure are
  width: string
  // The cell that names the row: an avatar with two lines of text beside it
  lead?: boolean
  // Classes for the column's header and cells, e.g. to hide it on a phone, the same as the real table's
  className?: string
  // What a cell holds instead of a line of text
  cell?: ReactNode
}

type SkeletonTableProps = { columns: SkeletonColumn[]; rows: number; avatar?: string }

// A table before its data: the header and the rows are as tall as the real ones, so the page doesn't move when it comes. It
// is made of the same table parts, so the lines between rows are the real ones.
export function SkeletonTable({ columns, rows, avatar = "size-10" }: SkeletonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(({ width, className }, i) => (
            <TableHead key={i} className={className}>
              <SkeletonText lineHeight={16} className={width} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row}>
            {columns.map(({ width, lead, className, cell }, i) => (
              <TableCell key={i} className={className}>
                {cell ??
                  (lead ? (
                    <div className="flex items-center gap-3">
                      <SkeletonAvatar className={avatar} />
                      <div className="flex flex-col">
                        <SkeletonText lineHeight={24} className="w-24" />
                        <SkeletonText lineHeight={16} className="w-36" />
                      </div>
                    </div>
                  ) : (
                    <SkeletonText lineHeight={20} className={width} />
                  ))}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </tbody>
    </Table>
  )
}

// What sits under a table that has pages: where you are in them, and the buttons for the others. As tall as the real one.
export function SkeletonTableFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-4 py-3",
        className
      )}
    >
      <SkeletonText lineHeight={20} className="w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-12 rounded-full" />
        <Skeleton className="h-10 w-12 rounded-full" />
      </div>
    </div>
  )
}
