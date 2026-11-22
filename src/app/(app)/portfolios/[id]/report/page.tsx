import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { ReviewAndBuy } from "@/components/Buy/ReviewAndBuy"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportColumn } from "@/components/Flow/ReportColumn"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportActionBar } from "@/components/Report/ReportActionBar"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { getReportScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getOrders, getReport } from "@/lib/report/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Report" }

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report, orders, session] = await Promise.all([
    getPortfolio((await params).id),
    getReport(1),
    getOrders(1),
    getSession(),
  ])
  if (!portfolio) notFound()

  const script = await getReportScript(portfolio)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
        agent={portfolio.status === "live" ? "on-demand" : "open"}
      >
        <ReportActionBar plan={report.plan} verdict={report.verdict}>
          <AppLink route="adapt" slug={portfolio.id} className={buttonVariants({ intent: "outline", size: "compact" })}>
            Adapt
          </AppLink>
          <ReviewAndBuy orders={orders} report={report} portfolioId={portfolio.id} network={session.network} />
        </ReportActionBar>
        <ReportHeader report={report} eyebrow={`Strategy report · ${portfolio.name}`} />
        <MetricTiles metrics={report.metrics} />
        <ReportColumn report={report} portfolioId={portfolio.id} />
      </FlowLayout>
    </div>
  )
}
