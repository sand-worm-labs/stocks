import type { Metadata } from "next"

import { BriefInput } from "@/components/Brief/BriefInput"
import { BriefReviewPanel } from "@/components/Brief/BriefReviewPanel"
import { BriefTabs } from "@/components/Brief/BriefTabs"
import { StockShortcuts } from "@/components/Brief/StockShortcuts"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { StepProgress } from "@/components/Flow/StepProgress"
import { parseBriefExample } from "@/lib/brief/parse"
import { getBriefReview } from "@/lib/brief/source"
import { byLiquidity } from "@/lib/markets/filter"
import { getMarketSummary, getStocks } from "@/lib/markets/source"
import { isBuyable } from "@/lib/markets/stock"

export const metadata: Metadata = { title: "Brief" }

type BriefPageProps = { searchParams: Promise<{ example?: string }> }

export default async function BriefPage({ searchParams }: BriefPageProps) {
  const review = await getBriefReview(parseBriefExample((await searchParams).example))
  const [stocks, summary] = await Promise.all([getStocks(), getMarketSummary()])

  return (
    <div className="mx-auto w-full max-w-3xl">
      <FlowLayout steps={<StepProgress current="brief" />}>
        <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">What should this portfolio do?</h1>
        <BriefTabs current="brief" />

        <BriefInput
          // A new brief starts the box again, so what it understood is never shown beside text it wasn't read from
          key={`input-${review.status}`}
          initialText={review.text}
          portfolioId={review.portfolioId}
          actionLabel={review.status === "needs-answers" ? "Research with these answers" : "Continue"}
        />
        <BriefReviewPanel key={`review-${review.status}`} review={review} />

        <StockShortcuts stocks={stocks.filter(isBuyable).sort(byLiquidity).slice(0, 6)} total={summary.buyable} />
      </FlowLayout>
    </div>
  )
}
