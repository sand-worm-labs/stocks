"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { PiPlus } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { routeHref } from "@/config/routes"
import { MARKET_PAGE_SIZE } from "@/constants/markets"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatCompactUsd, formatUsd } from "@/lib/format"
import type { BaseToken } from "@/lib/markets/tokens"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

import { Change } from "./Change"
import { Flash } from "./Flash"
import { useLiveMarketContext } from "./LiveMarket"
import { LiveStatus } from "./LiveStatus"
import { TokenAvatar } from "./TokenAvatar"
import { TradePulse } from "./TradePulse"

type TokenTableProps = { tokens: BaseToken[] }

// A token with what its pool says right now
type LiveToken = BaseToken & { liquidity?: number }

const toFraction = (percent?: number) => (percent === undefined ? undefined : percent / 100)

const column = createColumnHelper<LiveToken>()

const compactUsd = (value?: number) => (value === undefined ? "—" : formatCompactUsd(value))

function TokenName({ token: { image, symbol, company, address } }: { token: LiveToken }) {
  const { lastTrade } = useLiveMarketContext()
  const trade = lastTrade[address.toLowerCase()]

  return (
    <>
      <TokenAvatar image={image} symbol={symbol} />
      <span className="flex flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          {symbol}
          <TradePulse at={trade?.at} side={trade?.side} />
        </span>
        <span className="text-ink-400 max-w-48 truncate text-xs">{company}</span>
      </span>
    </>
  )
}

export function TokenTable({ tokens }: TokenTableProps) {
  const { quotes } = useLiveMarketContext()
  const live = useMemo<LiveToken[]>(
    () =>
      tokens.map((token) => {
        const quote = quotes[token.address.toLowerCase()]
        if (!quote) return token

        return {
          ...token,
          price: quote.price,
          change1h: toFraction(quote.change1h) ?? token.change1h,
          change24h: toFraction(quote.change24h) ?? token.change24h,
          volume: quote.volume24h ?? token.volume,
          liquidity: quote.liquidity,
        }
      }),
    [tokens, quotes]
  )

  const columns = useMemo(
    () => [
      column.accessor("rank", {
        header: "#",
        cell: ({ getValue }) => <span className="text-ink-400 tabular-nums">{getValue()}</span>,
      }),
      column.accessor("symbol", {
        header: "Token",
        cell: ({ row: { original: token } }) => (
          <AppLink route="stock" slug={token.id} className="flex items-center gap-3">
            <TokenName token={token} />
          </AppLink>
        ),
      }),
      column.accessor("price", {
        header: "Price",
        sortDescFirst: true,
        cell: ({ getValue }) => (
          <Flash value={getValue()}>
            <span className="tabular-nums">{formatUsd(getValue())}</span>
          </Flash>
        ),
      }),
      column.accessor("change1h", {
        header: "1h",
        sortDescFirst: true,
        sortUndefined: "last",
        meta: { className: "hidden sm:table-cell" },
        cell: ({ getValue }) => (
          <Flash value={getValue()}>
            <Change value={getValue()} />
          </Flash>
        ),
      }),
      column.accessor("change24h", {
        header: "24h",
        sortDescFirst: true,
        sortUndefined: "last",
        cell: ({ getValue }) => (
          <Flash value={getValue()}>
            <Change value={getValue()} />
          </Flash>
        ),
      }),
      column.accessor("change7d", {
        header: "7d",
        sortDescFirst: true,
        sortUndefined: "last",
        cell: ({ getValue }) => (
          <Flash value={getValue()}>
            <Change value={getValue()} />
          </Flash>
        ),
      }),
      column.display({
        id: "trend",
        header: "Last 7 days",
        meta: { className: "hidden lg:table-cell" },
        cell: ({ row: { original: token } }) => (
          <Sparkline
            series={token.series}
            className={cn("h-7 w-28", TONE_TEXT_CLASSNAME[changeTone(token.change7d ?? 0)])}
          />
        ),
      }),
      column.accessor("volume", {
        header: "Volume 24h",
        sortDescFirst: true,
        sortUndefined: "last",
        meta: { className: "hidden md:table-cell" },
        cell: ({ getValue }) => <span className="tabular-nums">{compactUsd(getValue())}</span>,
      }),
      column.accessor("liquidity", {
        header: "Liquidity",
        sortDescFirst: true,
        sortUndefined: "last",
        meta: { className: "hidden lg:table-cell" },
        cell: ({ getValue }) => <span className="tabular-nums">{compactUsd(getValue())}</span>,
      }),
      column.accessor("marketCap", {
        header: "Market cap",
        sortDescFirst: true,
        sortUndefined: "last",
        meta: { className: "hidden md:table-cell" },
        cell: ({ getValue }) => <span className="tabular-nums">{compactUsd(getValue())}</span>,
      }),
      column.accessor("issuer", {
        header: "Issuer",
        meta: { className: "hidden xl:table-cell" },
        cell: ({ getValue }) => <Badge>{getValue()}</Badge>,
      }),
      column.display({
        id: "action",
        header: () => <span className="sr-only">Action</span>,
        meta: { className: "text-right" },
        cell: () => (
          <AppLink
            route="newPortfolio"
            className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-2.5" })}
          >
            <PiPlus size={14} aria-hidden="true" />
            <span className="sr-only">Add to brief</span>
          </AppLink>
        ),
      }),
    ],
    []
  )

  return (
    <div className="flex flex-col gap-2">
      <LiveStatus />
      <DataTable
        data={live}
        columns={columns}
        getRowId={({ id }) => id}
        initialSorting={[{ id: "rank", desc: false }]}
        pageSize={MARKET_PAGE_SIZE}
        getRowHref={({ id }) => routeHref("stock", undefined, id)}
        emptyMessage="No tokenized stocks match."
      />
    </div>
  )
}
