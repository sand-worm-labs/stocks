"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { TOKEN_TABLE_PAGE_SIZE } from "@/constants/token"
import { formatDay, formatTime } from "@/lib/dates"
import { shortenAddress } from "@/lib/format"
import type { Transfer } from "@/lib/markets/transfers"

const column = createColumnHelper<Transfer>()

const explorer = (path: string) => `https://basescan.org/${path}`
const link = "text-accent dark:text-primary font-body-mono hover:underline"

function Explorer({ path, children }: { path: string; children: string }) {
  return (
    <a href={explorer(path)} target="_blank" rel="noopener noreferrer" className={link}>
      {children}
    </a>
  )
}

export function TransfersTable({ transfers, symbol }: { transfers: Transfer[]; symbol: string }) {
  const columns = [
    column.accessor("hash", {
      header: "Transaction",
      enableSorting: false,
      cell: ({ getValue }) => <Explorer path={`tx/${getValue()}`}>{shortenAddress(getValue())}</Explorer>,
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
      cell: ({ getValue }) => <Explorer path={`address/${getValue()}`}>{shortenAddress(getValue())}</Explorer>,
    }),
    column.accessor("to", {
      header: "To",
      enableSorting: false,
      cell: ({ getValue }) => <Explorer path={`address/${getValue()}`}>{shortenAddress(getValue())}</Explorer>,
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
    <DataTable
      data={transfers}
      columns={columns}
      getRowId={({ hash, from, to, amount }, i) => `${hash}-${from}-${to}-${amount}-${i}`}
      initialSorting={[{ id: "at", desc: true }]}
      pageSize={TOKEN_TABLE_PAGE_SIZE}
      emptyMessage="No transfers in the last hour."
    />
  )
}
