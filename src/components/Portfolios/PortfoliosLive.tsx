"use client"

import { useEffect, useState } from "react"
import { PiList, PiSquaresFour } from "react-icons/pi"

import { CountUp } from "@/components/Home/CountUp"
import { ProfitLine } from "@/components/Money/ProfitLine"
import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { SearchInput } from "@/components/SearchInput/SearchInput"
import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { SUMMARY_CARD_SURFACE } from "@/constants/cards"
import { deposited, profit } from "@/lib/portfolios/performance"
import { isLive, portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import {
  countsByView,
  inView,
  PORTFOLIO_SORTS,
  PORTFOLIO_VIEWS,
  type PortfolioSort,
  type PortfolioView,
  sortPortfolios,
} from "@/lib/portfolios/views"
import type { Session } from "@/lib/session/types"
import { cn } from "@/lib/utils"
import { filterPillClassName } from "@/styles/interactive"

import { PortfolioBoxes } from "./PortfolioBoxes"
import { PortfolioTable } from "./PortfolioTable"

type Layout = "list" | "boxes"
const LAYOUT_KEY = "sw.portfolios.layout"
const LAYOUTS = [
  { id: "boxes", label: "Boxes", icon: PiSquaresFour },
  { id: "list", label: "List", icon: PiList },
] as const

// The order each sort starts the table in
const SORTING = {
  profit: [{ id: "return", desc: true }],
  value: [{ id: "value", desc: true }],
  newest: [{ id: "created", desc: true }],
} as const

type PortfoliosLiveProps = {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  mode: Session["network"]["mode"]
}

// The list of portfolios at the prices the market is making: what they are worth, what each has made and how many are up or
// down all move with it. Narrow it to the ones winning or losing, and order it by what has made the most.
export function PortfoliosLive({ portfolios, addresses, mode }: PortfoliosLiveProps) {
  const live = useLivePortfolios(portfolios, addresses)
  const [view, setView] = useState<PortfolioView>("all")
  const [sort, setSort] = useState<PortfolioSort>("profit")
  // List to begin with; the choice is kept in the browser, and read once the page is there so the two agree on first show
  const [layout, setLayout] = useState<Layout>("list")
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY)
      if (saved === "boxes" || saved === "list") setLayout(saved)
    } catch {}
  }, [])
  const chooseLayout = (next: Layout) => {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {}
  }

  const running = live.filter(isLive)
  const value = running.reduce((sum, portfolio) => sum + (portfolioValue(portfolio) ?? 0), 0)
  const gained = running.reduce((sum, portfolio) => sum + profit(portfolio), 0)
  const put = running.reduce((sum, portfolio) => sum + deposited(portfolio), 0)
  const counts = countsByView(live)
  const shown = live.filter((portfolio) => inView(portfolio, view))

  return (
    <>
      <Card className={SUMMARY_CARD_SURFACE}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-5 py-4 md:px-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-400 text-sm">Total value</span>
            <span className="flex items-center gap-2.5 text-[36px] leading-[40px] font-normal tracking-tight">
              <UsdcMark className="size-7 flex-none" />
              <CountUp value={value} />
            </span>
          </div>
          <ProfitLine profit={gained} put={put} className="pb-1" />
        </div>

        {/* The controls, under the figures in the same card */}
        <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap items-center gap-x-3 gap-y-2.5 border-t px-4 py-3 md:px-5">
          <SearchInput
            param="q"
            label="Search portfolios"
            placeholder="Search..."
            className="w-full flex-none sm:w-56 md:max-w-none"
          />
          <div role="group" aria-label="Show" className="flex flex-wrap gap-3">
            {PORTFOLIO_VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={filterPillClassName(view === id)}
              >
                {label}
                <span className={cn("text-xs tabular-nums", view === id ? "opacity-70" : "text-ink-400")}>
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              label="Order by"
              options={[...PORTFOLIO_SORTS].map(({ id, label }) => ({ value: id, label }))}
              value={sort}
              onChange={setSort}
            />
            <div
              role="radiogroup"
              aria-label="Show as"
              className="bg-hover-bg border-hover-border dark:bg-sidebar-hover inline-flex gap-0.5 rounded-xl border p-0.5"
            >
              {LAYOUTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={layout === id}
                  aria-label={label}
                  title={label}
                  onClick={() => chooseLayout(id)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-[10px] transition-colors",
                    layout === id ? "bg-block-surface text-ink-100 shadow-sm" : "text-ink-400 hover:text-ink-100"
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {layout === "boxes" ? (
        <PortfolioBoxes key={`${view}-${sort}`} portfolios={sortPortfolios(shown, sort)} mode={mode} />
      ) : (
        <PortfolioTable key={`${view}-${sort}`} portfolios={shown} mode={mode} initialSorting={[...SORTING[sort]]} />
      )}
    </>
  )
}
