import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BuyReview } from "@/components/Buy/BuyReview"
import { AdaptColumn } from "@/components/Flow/AdaptColumn"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { getPortfolio } from "@/lib/portfolios/source"
import { getOrders, getReport } from "@/lib/report/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Buy" }

export default async function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report, orders, session] = await Promise.all([
    getPortfolio((await params).id),
    getReport(2),
    getOrders(),
    getSession(),
  ])
  if (!portfolio) notFound()

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout steps={<StepProgress current="buy" portfolioId={portfolio.id} />}>
        <ReportHeader report={report} />
        <BuyReview orders={orders} report={report} portfolioId={portfolio.id} network={session.network} />
        <MetricTiles metrics={report.metrics} />
        <AdaptColumn report={report} portfolioId={portfolio.id} />
      </FlowLayout>
    </div>
  )
}
