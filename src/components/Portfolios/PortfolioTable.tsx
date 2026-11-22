"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import { DataTable } from "@/components/ui/data-table"
import { routeHref } from "@/config/routes"
import { PORTFOLIO_STATUS } from "@/constants/portfolio"
import { TONE_DOT_CLASSNAME, TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent } from "@/lib/format"
import { portfolioValue, rulesText, statusText } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

import { PortfolioArt } from "./PortfolioArt"

const EMPTY = "—"

const column = createColumnHelper<Portfolio>()

const buildColumns = (mode: Session["network"]["mode"]) => [
  column.accessor("name", {
    header: "Portfolio",
    cell: ({ row: { original: portfolio } }) => {
      const { route } = PORTFOLIO_STATUS[portfolio.status]

      return (
        <AppLink route={route} slug={portfolio.id} className="flex items-center gap-3">
          <PortfolioArt status={portfolio.status} />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">{portfolio.name}</span>
            <span className="text-ink-400 max-w-xs truncate text-xs">{portfolio.brief}</span>
          </span>
        </AppLink>
      )
    },
  }),
  column.accessor("status", {
    header: "Status",
    cell: ({ row: { original: portfolio } }) => (
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("size-1.5 flex-none rounded-full", TONE_DOT_CLASSNAME[PORTFOLIO_STATUS[portfolio.status].tone])}
        />
        {statusText(portfolio, mode)}
      </span>
    ),
  }),
  column.accessor((portfolio) => portfolioValue(portfolio), {
    id: "value",
    header: "Value",
    sortDescFirst: true,
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const value = getValue()
      return <span className="tabular-nums">{value === undefined ? EMPTY : formatAmount(value)}</span>
    },
  }),
  column.accessor("weekChange", {
    header: "7d change",
    sortDescFirst: true,
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const change = getValue()
      return change === undefined ? (
        EMPTY
      ) : (
        <span className={cn("tabular-nums", TONE_TEXT_CLASSNAME[changeTone(change)])}>
          {formatPercent(change, { signed: true })}
        </span>
      )
    },
  }),
  column.display({
    id: "rules",
    header: "Rules",
    cell: ({ row: { original: portfolio } }) => <span className="tabular-nums">{rulesText(portfolio)}</span>,
  }),
]

export function PortfolioTable({ portfolios, mode }: { portfolios: Portfolio[]; mode: Session["network"]["mode"] }) {
  const columns = useMemo(() => buildColumns(mode), [mode])

  return (
    <DataTable
      data={portfolios}
      columns={columns}
      getRowId={({ id }) => id}
      getRowHref={({ id, status }) => routeHref(PORTFOLIO_STATUS[status].route, undefined, id)}
      emptyMessage="No portfolios match your search."
    />
  )
}
