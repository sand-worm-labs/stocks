import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { AdaptColumn } from "@/components/Flow/AdaptColumn"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { getAdaptScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getReport } from "@/lib/report/source"

export const metadata: Metadata = { title: "Adapt" }

export default async function AdaptPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report] = await Promise.all([getPortfolio((await params).id), getReport(2)])
  if (!portfolio) notFound()

  const script = await getAdaptScript(portfolio)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
      >
        <ReportHeader report={report} />
        <MetricTiles metrics={report.metrics} />
        <AdaptColumn
          report={report}
          portfolioId={portfolio.id}
          actions={
            <>
              <AppLink route="buy" slug={portfolio.id} className={buttonVariants({ intent: "dark", size: "compact" })}>
                Keep this version
              </AppLink>
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
