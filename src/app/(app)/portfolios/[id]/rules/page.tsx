import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { FlowHeader } from "@/components/Flow/FlowHeader"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportPlaceholder } from "@/components/Flow/ReportPlaceholder"
import { StepProgress } from "@/components/Flow/StepProgress"
import { LiveRules } from "@/components/PortfolioDetail/LiveRules"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { getActivity } from "@/lib/activity/source"
import { getRulesScript } from "@/lib/agent/source"
import { getStocks } from "@/lib/markets/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { readRules } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Rules" }

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const portfolio = await getPortfolio((await params).id)
  if (!portfolio) notFound()

  const rules = await getRules(portfolio)

  if (portfolio.status === "live") {
    const [stocks, activity, session] = await Promise.all([getStocks(), getActivity(portfolio.id), getSession()])

    return (
      <PortfolioShell portfolio={portfolio} current="rules">
        <LiveRules
          portfolio={portfolio}
          readings={readRules(portfolio, rules.rules, stocks)}
          strategy={rules.strategy}
          checks={activity.filter(({ kind }) => kind === "checked" || kind === "locked").slice(0, 4)}
          now={session.now}
        />
      </PortfolioShell>
    )
  }

  const script = await getRulesScript(portfolio, rules)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="rules" portfolioId={portfolio.id} />}
        aside={<AgentWorkspace script={script} />}
      >
        <FlowHeader
          title={portfolio.name}
          subtitle={rules.rules.map(({ label }) => label).join(" · ")}
          status={script.status}
        />
        <ReportPlaceholder />
      </FlowLayout>
    </div>
  )
}
