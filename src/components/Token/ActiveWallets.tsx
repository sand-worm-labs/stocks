"use client"

import { createColumnHelper } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { TOKEN_TABLE_PAGE_SIZE } from "@/constants/token"
import { shortenAddress } from "@/lib/format"
import type { activeWallets } from "@/lib/markets/transfers"

type Wallet = ReturnType<typeof activeWallets>[number]

const column = createColumnHelper<Wallet>()

const amount = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 })

export function ActiveWallets({ wallets, symbol }: { wallets: Wallet[]; symbol: string }) {
  const columns = [
    column.accessor("address", {
      header: "Wallet",
      enableSorting: false,
      cell: ({ getValue }) => (
        <a
          href={`https://basescan.org/address/${getValue()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent dark:text-primary font-body-mono hover:underline"
        >
          {shortenAddress(getValue())}
        </a>
      ),
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
    <DataTable
      data={wallets}
      columns={columns}
      getRowId={({ address }) => address}
      initialSorting={[{ id: "received", desc: true }]}
      pageSize={TOKEN_TABLE_PAGE_SIZE}
      emptyMessage="No wallets moved this token in the last hour."
    />
  )
}
