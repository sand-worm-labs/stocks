"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { Address } from "@/components/Address/Address"
import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { TOKEN_TABLE_PAGE_SIZE } from "@/constants/token"
import type { activeWallets } from "@/lib/markets/transfers"

type Wallet = ReturnType<typeof activeWallets>[number]

const column = createColumnHelper<Wallet>()

const amount = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 })

export function ActiveWallets({ wallets, symbol }: { wallets: Wallet[]; symbol: string }) {
  const columns = [
    column.accessor("address", {
      header: "Wallet",
      enableSorting: false,
      cell: ({ getValue }) => <Address value={getValue()} />,
    }),
    column.accessor("transfers", {
      header: "Transfers",
      sortDescFirst: true,
      cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
    }),
    column.accessor("received", {
      header: "Received",
      sortDescFirst: true,
      cell: ({ getValue }) => (
        <span className="tabular-nums">
          {amount(getValue())} {symbol}
        </span>
      ),
    }),
    column.accessor("sent", {
      header: "Sent",
      sortDescFirst: true,
      cell: ({ getValue }) => (
        <span className="tabular-nums">
          {amount(getValue())} {symbol}
        </span>
      ),
    }),
  ]

  return (
    <Card className="overflow-hidden [&_[data-slot=table-container]]:rounded-none [&_[data-slot=table-container]]:border-0">
      <DataTable
        data={wallets}
        columns={columns}
        getRowId={({ address }) => address}
        initialSorting={[{ id: "received", desc: true }]}
        pageSize={TOKEN_TABLE_PAGE_SIZE}
        emptyMessage="No wallets moved this token in the last hour."
      />
    </Card>
  )
}
