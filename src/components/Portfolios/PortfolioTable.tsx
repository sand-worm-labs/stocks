"use client"

import type { SortingState } from "@tanstack/react-table"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import { Flash } from "@/components/Markets/Flash"
import { Money } from "@/components/Money/Money"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import { DataTable } from "@/components/ui/data-table"
import { routeHref } from "@/config/routes"
import { PORTFOLIO_STATUS } from "@/constants/portfolio"
import { TONE_DOT_CLASSNAME, TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatDay } from "@/lib/dates"
import { formatPercent } from "@/lib/format"
import { profit, returnOnDeposit } from "@/lib/portfolios/performance"
import { isLive, portfolioValue, statusText } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

import { PortfolioIcon } from "./PortfolioIcon"

const EMPTY = "—"

// Forty models are a long page; ten at a time, with more to a page for anyone who wants it
const PAGE_SIZE = 10
const PAGE_SIZES = [10, 25, 50]

const column = createColumnHelper<Portfolio>()

// A figure only a live portfolio has, shown as a dash for the rest
const live = <T,>(portfolio: Portfolio, figure: (portfolio: Portfolio) => T) =>
  isLive(portfolio) ? figure(portfolio) : undefined

const buildColumns = (mode: Session["network"]["mode"]) => [
  column.accessor("name", {
    header: "Portfolio",
    cell: ({ row: { original: portfolio } }) => {
      const { route } = PORTFOLIO_STATUS[portfolio.status]

      return (
        <AppLink route={route} slug={portfolio.id} className="flex items-center gap-3">
          <PortfolioIcon name={portfolio.name} brief={portfolio.brief} />
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
        {statusText(portfolio)}
        {isLive(portfolio) && <TradingModeBadge mode={mode} />}
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
      return value === undefined ? (
        EMPTY
      ) : (
        <Flash value={value}>
          <Money value={value} />
        </Flash>
      )
    },
  }),
  column.accessor((portfolio) => live(portfolio, profit), {
    id: "profit",
    header: "Profit",
    sortDescFirst: true,
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const gained = getValue()
      return gained === undefined ? (
        EMPTY
      ) : (
        <Flash value={gained}>
          <span className={cn("tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gained)])}>
            <Money value={gained} signed />
          </span>
        </Flash>
      )
    },
  }),
  column.accessor((portfolio) => live(portfolio, returnOnDeposit), {
    id: "return",
    header: "Return",
    sortDescFirst: true,
    sortUndefined: "last",
    cell: ({ getValue, row: { original: portfolio } }) => {
      const gained = getValue()
      return gained === undefined ? (
        EMPTY
      ) : (
        <span className="flex items-center gap-3">
          <Flash value={gained}>
            <span className={cn("min-w-14 tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gained)])}>
              {formatPercent(gained, { signed: true })}
            </span>
          </Flash>
          <Sparkline
            series={portfolio.series}
            className={cn("hidden md:block", TONE_TEXT_CLASSNAME[changeTone(gained)])}
          />
        </span>
      )
    },
  }),
  column.accessor("createdAt", {
    id: "created",
    header: "Created",
    sortDescFirst: true,
    meta: { className: "hidden lg:table-cell" },
    cell: ({ getValue }) => <span className="text-ink-400">{formatDay(getValue())}</span>,
  }),
]

type PortfolioTableProps = {
  portfolios: Portfolio[]
  mode: Session["network"]["mode"]
  initialSorting?: SortingState
}

export function PortfolioTable({ portfolios, mode, initialSorting }: PortfolioTableProps) {
  const columns = useMemo(() => buildColumns(mode), [mode])

  return (
    <DataTable
      data={portfolios}
      columns={columns}
      getRowId={({ id }) => id}
      initialSorting={initialSorting}
      pageSize={PAGE_SIZE}
      pageSizes={PAGE_SIZES}
      getRowHref={({ id, status }) => routeHref(PORTFOLIO_STATUS[status].route, undefined, id)}
      emptyMessage="No portfolios match."
    />
  )
}
