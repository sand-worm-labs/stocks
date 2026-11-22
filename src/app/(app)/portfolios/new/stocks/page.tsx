import type { Metadata } from "next"
import { PiMagnifyingGlass } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { BriefTabs } from "@/components/Brief/BriefTabs"
import { buttonVariants } from "@/components/Button/Button"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { StepProgress } from "@/components/Flow/StepProgress"
import { CategoryCard } from "@/components/StockPicker/CategoryCard"
import { StockPickRow } from "@/components/StockPicker/StockPickRow"
import { Card } from "@/components/ui/card"
import { getBriefDraft } from "@/lib/brief/source"
import { summarizeCategory } from "@/lib/markets/category"
import { getCategories, getMarketSummary, getStocks } from "@/lib/markets/source"

export const metadata: Metadata = { title: "Stocks or a category" }

// The category the mock starts with picked
const PICKED_CATEGORY = "robotics"

export default async function StockPickerPage() {
  const [stocks, categories, summary, draft] = await Promise.all([
    getStocks(),
    getCategories(),
    getMarketSummary(),
    getBriefDraft(),
  ])
  const picked = categories.find(({ id }) => id === PICKED_CATEGORY)

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <FlowLayout steps={<StepProgress current="brief" />}>
        <h1 className="mt-4 text-center text-3xl font-medium md:text-[40px] md:leading-[48px]">
          What do you want to build around?
        </h1>
        <BriefTabs current="stockPicker" />

        <label className="border-border bg-base-100 dark:border-border-tertiary dark:bg-base-400 flex items-center gap-2 rounded-full border px-4 py-2.5">
          <PiMagnifyingGlass aria-hidden="true" className="text-ink-400" />
          <span className="sr-only">Search stocks</span>
          <input
            placeholder={`Search ${summary.buyable} stocks you can buy on Base`}
            className="placeholder:text-placeholder-muted w-full bg-transparent text-sm outline-none"
          />
        </label>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-medium">Pick a whole category</h2>
            <p className="text-ink-400 text-sm">The agent uses every buyable stock in it.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                picked={category.id === PICKED_CATEGORY}
                {...summarizeCategory(category, stocks)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium">Or pick single stocks</h2>
            <p className="text-ink-400 text-sm">Grouped by category. Mix them with categories if you like.</p>
          </div>
          {categories.map((category) => {
            const { buyable } = summarizeCategory(category, stocks)
            return (
              <div key={category.id} className="flex flex-col gap-2">
                <h3 className="text-ink-400 text-sm font-medium">
                  {category.label} · {buyable.length} buyable
                </h3>
                <Card>
                  {buyable.map((stock) => (
                    <StockPickRow
                      key={stock.symbol}
                      stock={stock}
                      picked={!!picked?.symbols.includes(stock.symbol)}
                      includedWith={
                        category.id !== PICKED_CATEGORY && picked?.symbols.includes(stock.symbol)
                          ? picked.label
                          : undefined
                      }
                    />
                  ))}
                </Card>
              </div>
            )
          })}
        </section>

        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-400 text-xs">Categories, prices and liquidity: o1 Launchpad.</p>
          <AppLink
            route="rules"
            slug={draft.portfolioId}
            className={buttonVariants({ intent: "dark", size: "compact" })}
          >
            Continue
          </AppLink>
        </div>
      </FlowLayout>
    </div>
  )
}
