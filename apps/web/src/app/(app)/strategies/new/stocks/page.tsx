import type { Metadata } from "next"

import { BriefTabs } from "@/components/Brief/BriefTabs"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { StepProgress } from "@/components/Flow/StepProgress"
import { StockPicker } from "@/components/StockPicker/StockPicker"
import { getCategories, getMarketSummary, getStocks } from "@/lib/markets/source"

export const metadata: Metadata = { title: "Stocks or a category" }

export default async function StockPickerPage() {
  const [stocks, categories, summary] = await Promise.all([getStocks(), getCategories(), getMarketSummary()])

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <FlowLayout steps={<StepProgress current="brief" />}>
        <h1 className="mt-4 text-center text-3xl font-medium md:text-[40px] md:leading-[48px]">
          What do you want to build around?
        </h1>
        <BriefTabs current="stockPicker" />
        <StockPicker
          stocks={stocks}
          categories={categories.filter(({ symbols }) => symbols.length)}
          buyableCount={summary.buyable}
        />
      </FlowLayout>
    </div>
  )
}
