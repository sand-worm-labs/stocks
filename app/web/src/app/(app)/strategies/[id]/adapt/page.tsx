import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
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
import { getAdaptScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getOrders, getReport } from "@/lib/report/source"
import { getSession } from "@/lib/session/source"
import { getOwnStrategy } from "@/lib/strategies/source"

export const metadata: Metadata = { title: "Refine" }

export default async function AdaptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [portfolio, report, orders, session] = await Promise.all([
    getPortfolio(id),
    getReport(2, id),
    getOrders(2, id),
    getSession(),
  ])
  if (!portfolio) notFound()

  const script = await getAdaptScript(portfolio)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
      >
        <ReportActionBar plan={report.plan} verdict={report.verdict} />
        <ReportHeader report={report} eyebrow={`Strategy results · ${portfolio.name}`} />
        <MetricTiles metrics={report.metrics} />
        <AdaptColumn
          report={report}
          portfolioId={portfolio.id}
          actions={
            <>
              <ReviewAndBuy
                label="Keep this version"
                orders={orders}
                report={report}
                portfolioId={portfolio.id}
                network={session.network}
                demo={!(await getOwnStrategy(id))}
              />
              <AppLink
                route="report"
                slug={portfolio.id}
                className={buttonVariants({ intent: "outline", size: "compact" })}
              >
                Undo
              </AppLink>
            </>
          }
        />
      </FlowLayout>
    </div>
  )
}
