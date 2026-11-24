"use client"

import { useRef, useState } from "react"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { Reveal } from "@/components/Reveal/Reveal"
import { SearchInput } from "@/components/SearchInput/SearchInput"
import { Pagination } from "@/components/ui/pagination"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import {
  aggregateStocks,
  groupHoldingsByModel,
  matchesSearch,
  type ModelHoldings,
  type StockRow,
  summarizeHoldings,
} from "@/lib/holdings/groups"
import { buildAllocation } from "@/lib/home/allocation"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"

import { AllStocksTable } from "./AllStocksTable"
import { HoldingsSummary } from "./HoldingsSummary"
import { HoldingsSwarm } from "./HoldingsSwarm"
import { type HoldingsTab, HoldingsTabs } from "./HoldingsTabs"
import { HoldingsViewTabs } from "./HoldingsViewTabs"
import { ModelHoldingsCard } from "./ModelHoldingsCard"

// The biggest models are open; with many, the rest fold shut until opened or searched for
const OPEN_MODELS = 5
// Models, or stocks, to a page
const MODELS_PER_PAGE = 10
const STOCKS_PER_PAGE = 25

type HoldingsLiveProps = {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  names: { symbol: string; name: string }[]
  tab: HoldingsTab
  view: "models" | "stocks"
  query: string
}

// Everything held, at the prices the market is making now: the total, the gain, the heatmap, each model and each stock all
// follow it as it moves
export function HoldingsLive({ portfolios, addresses, names, tab, view, query }: HoldingsLiveProps) {
  const live = useLivePortfolios(portfolios, addresses)
  const models = groupHoldingsByModel(live, names)
  const searching = query.trim() !== ""
  const { value, gain, gainRate, ...counts } = summarizeHoldings(models)
  // Where what is held sits, by model, as the home shows it but without the cash
  const slices = buildAllocation(live).filter(({ id }) => id !== "cash")

  return (
    <>
      <HoldingsTabs current={tab} />
      {tab === "summary" ? (
        <>
          <HoldingsSummary
            value={value}
            gain={gain}
            gainRate={gainRate}
            slices={slices}
            figures={[
              { id: "stocks", label: "Stocks", value: String(counts.stocks), caption: "different ones, once each" },
              { id: "models", label: "Strategies", value: String(counts.models), caption: "holding them" },
              {
                id: "gain",
                label: "Profit / loss",
                value: formatSignedAmount(gain),
                caption: `${formatPercent(gainRate, { signed: true })} on what you paid`,
                tone: changeTone(gain),
              },
              { id: "paid", label: "You paid", value: formatAmount(value - gain), caption: "USDC, for what you hold" },
            ]}
          />
          <Reveal index={1}>
            <HoldingsSwarm stocks={aggregateStocks(models)} />
          </Reveal>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <HoldingsViewTabs view={view} query={query} />
            <SearchInput param="q" label="Search your portfolio" placeholder="Search stocks you hold..." />
          </div>
          {/* Keyed by what is shown, so a new view or a new search starts on its first page */}
          <PagedList
            key={`${view}-${query}`}
            view={view}
            stocks={aggregateStocks(models).filter((stock) => matchesSearch(stock, query))}
            models={models
              .map((model) => ({ ...model, rows: model.rows.filter((row) => matchesSearch(row, query)) }))
              .filter(({ rows }) => rows.length > 0)}
            searching={searching}
          />
        </>
      )}
    </>
  )
}

type PagedListProps = {
  view: "models" | "stocks"
  models: ModelHoldings[]
  stocks: StockRow[]
  searching: boolean
}

// The holdings a page at a time: ten models, or the stocks twenty-five at a time, with the way to the other pages under
function PagedList({ view, models, stocks, searching }: PagedListProps) {
  const [page, setPage] = useState(0)
  const top = useRef<HTMLDivElement>(null)
  const size = view === "stocks" ? STOCKS_PER_PAGE : MODELS_PER_PAGE
  const total = view === "stocks" ? stocks.length : models.length
  const go = (next: number) => {
    setPage(next)
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={top} className="flex scroll-mt-[calc(var(--shell-top)+1rem)] flex-col gap-6">
      {view === "stocks" ? (
        <AllStocksTable stocks={stocks.slice(page * size, (page + 1) * size)} />
      ) : (
        models
          .slice(page * size, (page + 1) * size)
          .map((model) => (
            <ModelHoldingsCard key={model.portfolio.id} model={model} open={searching || model.index < OPEN_MODELS} />
          ))
      )}
      <Pagination page={page} pageSize={size} total={total} onPage={go} />
    </div>
  )
}
