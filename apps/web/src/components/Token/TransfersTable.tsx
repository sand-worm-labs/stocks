"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { Address } from "@/components/Address/Address"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { TOKEN_TABLE_PAGE_SIZE } from "@/constants/token"
import { formatDay, formatTime } from "@/lib/dates"
import type { Transfer } from "@/lib/markets/transfers"

const column = createColumnHelper<Transfer>()

export function TransfersTable({ transfers, symbol }: { transfers: Transfer[]; symbol: string }) {
  const columns = [
    column.accessor("hash", {
      header: "Transaction",
      enableSorting: false,
      cell: ({ getValue }) => <Address value={getValue()} kind="tx" />,
    }),
    column.accessor("at", {
      header: "When",
      sortDescFirst: true,
      cell: ({ getValue }) => {
        const iso = new Date(getValue()).toISOString()
        return (
          <span className="text-ink-400">
            {formatDay(iso)} {formatTime(iso)}
          </span>
        )
      },
    }),
    column.accessor("from", {
      header: "From",
      enableSorting: false,
      cell: ({ getValue }) => <Address value={getValue()} />,
    }),
    column.accessor("to", {
      header: "To",
      enableSorting: false,
      cell: ({ getValue }) => <Address value={getValue()} />,
    }),
    column.accessor("amount", {
      header: "Amount",
      sortDescFirst: true,
      meta: { className: "text-right" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">
          {getValue().toLocaleString("en-US", { maximumFractionDigits: 4 })} {symbol}
        </span>
      ),
    }),
  ]

  return (
    <Card className="overflow-hidden [&_[data-slot=table-container]]:rounded-none [&_[data-slot=table-container]]:border-0">
      <DataTable
        data={transfers}
        columns={columns}
        getRowId={({ hash, from, to, amount }, i) => `${hash}-${from}-${to}-${amount}-${i}`}
        initialSorting={[{ id: "at", desc: true }]}
        pageSize={TOKEN_TABLE_PAGE_SIZE}
        emptyMessage="No transfers in the last hour."
      />
    </Card>
  )
}
