import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { ResearchSection } from "@/components/Report/sections/ResearchSection"
import { Card } from "@/components/ui/card"
import { RESEARCH_STEPS } from "@/constants/flow"
import { getResearchScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getReport } from "@/lib/report/source"

export const metadata: Metadata = { title: "Research" }

// How far along the mock research is
const DONE_STEPS = 2

export default async function ResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const [portfolio, report] = await Promise.all([getPortfolio((await params).id), getReport(1)])
  if (!portfolio) notFound()

  const script = await getResearchScript(portfolio, DONE_STEPS)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="research" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
      >
        <Card className="flex flex-col gap-3 p-4 md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{RESEARCH_STEPS[DONE_STEPS - 1]}…</span>
            <span className="text-ink-400 text-sm">
              {DONE_STEPS} of {RESEARCH_STEPS.length}
            </span>
          </div>
          <div className="bg-inputBg h-2 overflow-hidden rounded-full dark:bg-white/10">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${(DONE_STEPS / RESEARCH_STEPS.length) * 100}%` }}
            />
          </div>
        </Card>

        <header className="flex flex-col gap-1">
          <span className="text-ink-400 text-sm">Strategy report · {portfolio.name}</span>
          <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">Writing the verdict…</h1>
          <p className="text-ink-400 text-sm">Writing… sections appear as each step finishes</p>
        </header>

        <ResearchSection research={report.research} />

        <AppLink
          route="report"
          slug={portfolio.id}
          className={buttonVariants({ intent: "outline", size: "compact", className: "self-start" })}
        >
          Skip to the report
        </AppLink>
      </FlowLayout>
    </div>
  )
}
