import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { AdaptColumn } from "@/components/Flow/AdaptColumn"
import { AgentPanel } from "@/components/Flow/AgentPanel"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ResearchSteps } from "@/components/Flow/ResearchSteps"
import { StepProgress } from "@/components/Flow/StepProgress"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { RESEARCH_STEPS } from "@/constants/flow"
import { getPortfolio } from "@/lib/portfolios/source"
import { getReport } from "@/lib/report/source"

export const metadata: Metadata = { title: "Adapt" }

const QUICK_CHANGES = ["Less risk", "Rebalance monthly", "Swap Tesla for Apple", "Add a 5th stock"]

export default async function AdaptPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report] = await Promise.all([getPortfolio((await params).id), getReport(2)])
  if (!portfolio) notFound()

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={
          <AgentPanel brief={portfolio.brief}>
            <p className="text-sm">
              Rerunning only what changes: Design, Backtest, Bias check, Score and Honesty check. Research is reused.
            </p>
            <ResearchSteps done={RESEARCH_STEPS.length} reused={["Research"]} />
            <div className="flex flex-wrap gap-2">
              {QUICK_CHANGES.map((change) => (
                <button
                  key={change}
                  type="button"
                  className="border-border hover:border-primary dark:border-border-tertiary rounded-full border px-3 py-1 text-xs transition-colors"
                >
                  {change}
                </button>
              ))}
            </div>
          </AgentPanel>
        }
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
