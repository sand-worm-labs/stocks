import type { Metadata } from "next"

import { BriefTabs } from "@/components/Brief/BriefTabs"
import { BriefWorkspace } from "@/components/Brief/BriefWorkspace"
import { StockShortcuts } from "@/components/Brief/StockShortcuts"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { StepProgress } from "@/components/Flow/StepProgress"
import { getBriefDraft } from "@/lib/brief/source"
import { byLiquidity } from "@/lib/markets/filter"
import { getMarketSummary, getStocks } from "@/lib/markets/source"
import { isBuyable } from "@/lib/markets/stock"

export const metadata: Metadata = { title: "Brief" }

export default async function BriefPage() {
  const [draft, stocks, summary] = await Promise.all([getBriefDraft(), getStocks(), getMarketSummary()])

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <FlowLayout steps={<StepProgress current="brief" />}>
        <h1 className="mt-4 text-center text-3xl font-medium md:text-[40px] md:leading-[48px]">
          What should this portfolio do?
        </h1>
        <BriefTabs current="brief" />
        <BriefWorkspace initialText={draft.text} portfolioId={draft.portfolioId} examples={draft.examples} />
        <StockShortcuts stocks={stocks.filter(isBuyable).sort(byLiquidity).slice(0, 6)} total={summary.buyable} />
      </FlowLayout>
    </div>
  )
}
