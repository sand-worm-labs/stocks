import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { FlowHeader } from "@/components/Flow/FlowHeader"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportPlaceholder } from "@/components/Flow/ReportPlaceholder"
import { StepProgress } from "@/components/Flow/StepProgress"
import { getRulesScript } from "@/lib/agent/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getRules } from "@/lib/rules/source"

export const metadata: Metadata = { title: "Rules" }

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const portfolio = await getPortfolio((await params).id)
  if (!portfolio) notFound()

  const rules = await getRules(portfolio)
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
