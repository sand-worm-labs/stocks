import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { ReviewAndBuy } from "@/components/Buy/ReviewAndBuy"
import { AdaptColumn } from "@/components/Flow/AdaptColumn"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportActionBar } from "@/components/Report/ReportActionBar"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { routeHref } from "@/config/routes"
import { getPortfolio } from "@/lib/portfolios/source"
import { getOrders, getReport } from "@/lib/report/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Trade" }

// Buying is a review over the report of the version being bought, so this is that report with the review already open.
// Closing it goes back to the version.
export default async function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report, orders, session] = await Promise.all([
    getPortfolio((await params).id),
    getReport(2),
    getOrders(2),
    getSession(),
  ])
  if (!portfolio) notFound()

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout steps={<StepProgress current="buy" portfolioId={portfolio.id} />}>
        <ReportActionBar plan={report.plan} verdict={report.verdict}>
          <AppLink route="adapt" slug={portfolio.id} className={buttonVariants({ intent: "outline", size: "compact" })}>
            Refine
          </AppLink>
          <ReviewAndBuy
            orders={orders}
            report={report}
            portfolioId={portfolio.id}
            network={session.network}
            startOpen={{ closeHref: routeHref("adapt", undefined, portfolio.id) ?? "/strategies" }}
          />
        </ReportActionBar>
        <ReportHeader report={report} eyebrow={`Strategy results · ${portfolio.name}`} />
        <MetricTiles metrics={report.metrics} />
        <AdaptColumn report={report} portfolioId={portfolio.id} />
      </FlowLayout>
    </div>
  )
}
