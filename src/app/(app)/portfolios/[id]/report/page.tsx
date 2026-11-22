import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportColumn } from "@/components/Flow/ReportColumn"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { getReportScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getReport } from "@/lib/report/source"

export const metadata: Metadata = { title: "Report" }

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report] = await Promise.all([getPortfolio((await params).id), getReport(1)])
  if (!portfolio) notFound()

  const script = await getReportScript(portfolio)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
      >
        <ReportHeader
          report={report}
          actions={
            <>
              <AppLink
                route="adapt"
                slug={portfolio.id}
                className={buttonVariants({ intent: "outline", size: "compact" })}
              >
                Adapt
              </AppLink>
              <AppLink route="buy" slug={portfolio.id} className={buttonVariants({ intent: "dark", size: "compact" })}>
                Review &amp; buy
              </AppLink>
            </>
          }
        />
        <MetricTiles metrics={report.metrics} />
        <ReportColumn report={report} portfolioId={portfolio.id} />
      </FlowLayout>
    </div>
  )
}
