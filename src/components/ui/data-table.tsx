"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PiCaretDownFill, PiCaretLeft, PiCaretRight, PiCaretUpDownFill, PiCaretUpFill } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    // Classes for the column's header and cells, e.g. to hide it on a phone
    className?: string
  }
}

const DEFAULT_PAGE_SIZES = [25, 50, 100]

const SORT_ICON = { asc: PiCaretUpFill, desc: PiCaretDownFill, none: PiCaretUpDownFill } as const
const ARIA_SORT = { asc: "ascending", desc: "descending", none: "none" } as const

type DataTableProps<TData> = {
  data: TData[]
  // The columns of one table have different value types, so the value type is open
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  getRowId: (row: TData, index: number) => string
  initialSorting?: SortingState
  // Rows to a page; without it every row is shown
  pageSize?: number
  // The page sizes to choose from, when it isn't the usual ones
  pageSizes?: number[]
  // Where a click anywhere on a row goes. The links and buttons inside a row keep their own.
  getRowHref?: (row: TData) => string | null
  // Called with the rows on show, whenever they change
  onVisibleRowsChange?: (rows: TData[]) => void
  emptyMessage: string
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  initialSorting = [],
  pageSize,
  pageSizes = DEFAULT_PAGE_SIZES,
  getRowHref,
  onVisibleRowsChange,
  emptyMessage,
}: DataTableProps<TData>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Fresh prices arrive while a page is open, and they shouldn't send the reader back to the first one
    autoResetPageIndex: false,
    ...(pageSize && { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize } } }),
  })
  const href = (row: TData) => getRowHref?.(row) ?? null
  const { rows } = table.getRowModel()
  const shownKey = rows.map(({ id }) => id).join()
  useEffect(() => {
    onVisibleRowsChange?.(rows.map(({ original }) => original))
  }, [shownKey])

  const { pageIndex, pageSize: size } = table.getState().pagination
  const total = table.getPrePaginationRowModel().rows.length

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map(({ id, column, getContext }) => {
                const direction = column.getIsSorted() || "none"
                const SortIcon = SORT_ICON[direction]

                return (
                  <TableHead
                    key={id}
                    aria-sort={column.getCanSort() ? ARIA_SORT[direction] : undefined}
                    className={column.columnDef.meta?.className}
                  >
                    {column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className="hover:text-ink-100 flex items-center gap-2 uppercase transition-colors outline-none"
                      >
                        {flexRender(column.columnDef.header, getContext())}
                        <SortIcon
                          size={12}
                          aria-hidden="true"
                          className={cn(direction === "none" ? "text-ink-300" : "text-ink-100")}
                        />
                      </button>
                    ) : (
                      flexRender(column.columnDef.header, getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(href(row.original) && "hover:bg-inputBg/60 cursor-pointer dark:hover:bg-white/5")}
              onClick={(event) => {
                const target = href(row.original)
                if (target && !(event.target as HTMLElement).closest("a, button")) router.push(target)
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </tbody>
      </Table>
      {!rows.length && <p className="text-ink-400 py-20 text-center text-sm">{emptyMessage}</p>}
      {pageSize && total > Math.min(...pageSizes) && (
        <div className="text-ink-400 border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="flex items-center gap-3">
            <span className="hidden items-center gap-2 sm:flex">
              Show rows
              <Select value={String(size)} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger aria-label="Rows per page" className="min-h-8 rounded-lg px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
            <span>
              {pageIndex * size + 1}–{Math.min((pageIndex + 1) * size, total)} of {total}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Page {pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className={buttonVariants({
                intent: "outline",
                size: "sm",
                className: "min-w-0 px-3 disabled:opacity-40",
              })}
            >
              <PiCaretLeft size={14} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className={buttonVariants({
                intent: "outline",
                size: "sm",
                className: "min-w-0 px-3 disabled:opacity-40",
              })}
            >
              <PiCaretRight size={14} />
            </button>
          </span>
        </div>
      )}
    </>
  )
}
