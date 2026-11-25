"use client"

import { useMemo, useState } from "react"
import { PiCircleNotch, PiMagnifyingGlass } from "react-icons/pi"

import { useStartStrategy } from "@/components/Brief/useStartStrategy"
import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { EmptyResults } from "@/components/ui/empty-results"
import { Pill } from "@/components/ui/pill"
import { SearchField } from "@/components/ui/search-field"
import { briefFromPicks } from "@/lib/brief/fromPicks"
import { filterPicker, pickedWith } from "@/lib/markets/picker"
import { cn } from "@/lib/utils"
import type { Stock, StockCategory } from "@/types/markets"

import { CategoryCard } from "./CategoryCard"
import { StockPickRow } from "./StockPickRow"

type StockPickerProps = {
  stocks: Stock[]
  categories: StockCategory[]
  buyableCount: number
  initialCategoryIds: string[]
}

const toggle = <T,>(set: Set<T>, item: T) => {
  const next = new Set(set)
  if (!next.delete(item)) next.add(item)
  return next
}

export function StockPicker({ stocks, categories, buyableCount, initialCategoryIds }: StockPickerProps) {
  const { start, busy } = useStartStrategy()
  const [query, setQuery] = useState("")
  const [pickedCategories, setPickedCategories] = useState(() => new Set(initialCategoryIds))
  const [pickedStocks, setPickedStocks] = useState(() => new Set<string>())

  const view = useMemo(() => filterPicker(query, stocks, categories), [query, stocks, categories])
  const pickCount = pickedCategories.size + pickedStocks.size
  const pickedLabels = [
    ...categories.filter(({ id }) => pickedCategories.has(id)).map(({ label }) => label),
    ...[...pickedStocks].map((symbol) => stocks.find((stock) => stock.symbol === symbol)?.name ?? symbol),
  ]
  const bySymbol = useMemo(() => new Map(stocks.map((stock) => [stock.symbol, stock])), [stocks])

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        appearance="raised"
        label="Search stocks and categories"
        placeholder={`Search ${buyableCount} stocks you can buy on Base`}
      />

      {pickCount > 0 && (
        <section aria-label="Your pick" className="animate-fade-up flex flex-wrap items-center gap-2">
          <span className="text-ink-400 text-xs font-medium">Your pick</span>
          {categories
            .filter(({ id }) => pickedCategories.has(id))
            .map(({ id, label }) => (
              <Pill key={id} onRemove={() => setPickedCategories((current) => toggle(current, id))}>
                {`${label} · all`}
              </Pill>
            ))}
          {Array.from(pickedStocks).map((symbol) => (
            <Pill key={symbol} onRemove={() => setPickedStocks((current) => toggle(current, symbol))}>
              {bySymbol.get(symbol)?.symbol ?? symbol}
            </Pill>
          ))}
          <button
            type="button"
            onClick={() => {
              setPickedCategories(new Set())
              setPickedStocks(new Set())
            }}
            className="text-ink-400 hover:text-ink-100 ml-1 text-xs font-medium transition-colors"
          >
            Clear all
          </button>
        </section>
      )}

      {view.isEmpty ? (
        <EmptyResults
          icon={PiMagnifyingGlass}
          title={`No stocks matching "${query.trim()}"`}
          hint="Try a symbol like NVDAc, a company name, or a category like robotics."
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className={buttonVariants({ intent: "outline", size: "sm", className: "min-w-0 px-4" })}
            >
              Clear search
            </button>
          }
        />
      ) : (
        <>
          {!!view.categories.length && (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-medium">Pick a whole category</h2>
                <p className="text-ink-400 text-sm">The agent uses every buyable stock in it.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {view.categories.map(({ category, buyable, liquidity }) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    buyable={buyable}
                    liquidity={liquidity}
                    checked={pickedCategories.has(category.id)}
                    onToggle={() => setPickedCategories((current) => toggle(current, category.id))}
                  />
                ))}
              </div>
            </section>
          )}

          {!!view.stockGroups.length && (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-medium">Or pick single stocks</h2>
                <p className="text-ink-400 text-sm">Grouped by category. Mix them with categories if you like.</p>
              </div>
              {view.stockGroups.map(({ category, buyable, shown }) => (
                <div key={category.id} className="flex flex-col gap-2">
                  <h3 className="text-ink-400 text-sm font-medium">
                    {category.label} · {query.trim() ? `${shown.length} of ${buyable.length}` : buyable.length} buyable
                  </h3>
                  <Card>
                    {shown.map((stock) => {
                      const via = pickedWith(stock.symbol, categories, pickedCategories)
                      return (
                        <StockPickRow
                          key={stock.symbol}
                          stock={stock}
                          checked={!!via || pickedStocks.has(stock.symbol)}
                          includedWith={via?.label}
                          onToggle={() => setPickedStocks((current) => toggle(current, stock.symbol))}
                        />
                      )
                    })}
                  </Card>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <div className="flex justify-end">
        {pickCount > 0 ? (
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => start(briefFromPicks(pickedLabels))}
            className={cn(
              buttonVariants({ intent: "dark", size: "compact" }),
              "gap-2 disabled:cursor-wait disabled:opacity-70"
            )}
          >
            {busy && <PiCircleNotch aria-hidden="true" className="animate-spin" />}
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled
            className={cn(buttonVariants({ intent: "dark", size: "compact" }), "cursor-not-allowed opacity-40")}
          >
            Pick something to continue
          </button>
        )}
      </div>
    </>
  )
}
