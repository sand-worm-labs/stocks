import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { ReviewAndBuy } from "@/components/Buy/ReviewAndBuy"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportColumn } from "@/components/Flow/ReportColumn"
import { StepProgress } from "@/components/Flow/StepProgress"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportActionBar } from "@/components/Report/ReportActionBar"
import { ReportActions } from "@/components/Report/ReportActions"
import { ReportDocument } from "@/components/Report/ReportDocument"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { getReportScript, getResultScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getOrders, getReport } from "@/lib/report/source"
import { getSession } from "@/lib/session/source"
import { getOwnStrategy } from "@/lib/strategies/source"

export const metadata: Metadata = { title: "Results" }

const TONES = { good: "positive", warn: "warning", bad: "negative" } as const
const verdictOf = ({ label, tone }: { label: string; tone: keyof typeof TONES }) => ({ label, tone: TONES[tone] })

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [portfolio, report, orders, session, own] = await Promise.all([
    getPortfolio(id),
    getReport(1, id),
    getOrders(1, id),
    getSession(),
    getOwnStrategy(id),
  ])
  if (!portfolio) notFound()
  if (own && own.status === "draft" && own.stage !== "ready") redirect(`/strategies/${id}`)

  // What a real run found. Without one, the stand-in's template report is shown, saying that it is one.
  const result = own?.research?.result
  const script = result ? await getResultScript(portfolio, result) : await getReportScript(portfolio)

  const document = result && own && (
    <ReportDocument
      id={own.id}
      name={own.name}
      brief={own.brief}
      result={result}
      amount={own.budget}
      preparedAt={own.events.find(({ kind }) => kind === "ready")?.at ?? own.updatedAt}
      actions={<ReportActions strategyId={own.id} name={own.name} />}
    />
  )

  // Once it is trading, the report is one of the strategy's own pages, in the same frame as the others
  if (document && (own?.status === "live" || own?.status === "closed"))
    return (
      <PortfolioShell portfolio={portfolio} current="report">
        {document}
      </PortfolioShell>
    )

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="report" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} strategyId={portfolio.own ? portfolio.id : undefined} />}
        agent={portfolio.status === "live" || portfolio.status === "closed" ? "on-demand" : "open"}
      >
        <ReportActionBar plan={report.plan} verdict={result?.verdict ? verdictOf(result.verdict) : report.verdict}>
          <AppLink route="adapt" slug={portfolio.id} className={buttonVariants({ intent: "outline", size: "compact" })}>
            Refine
          </AppLink>
          {portfolio.status !== "live" && portfolio.status !== "closed" && (
            <ReviewAndBuy
              orders={orders}
              report={report}
              portfolioId={portfolio.id}
              network={session.network}
              demo={!own}
              research={result}
            />
          )}
        </ReportActionBar>
        {document ?? (
          <>
            <ReportHeader report={report} eyebrow={`Strategy results · ${portfolio.name}`} />
            <MetricTiles metrics={report.metrics} />
            <ReportColumn report={report} portfolioId={portfolio.id} />
          </>
        )}
      </FlowLayout>
    </div>
  )
}
