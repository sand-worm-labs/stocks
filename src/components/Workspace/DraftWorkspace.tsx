import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { ReviewAndBuy } from "@/components/Buy/ReviewAndBuy"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { ReportColumn } from "@/components/Flow/ReportColumn"
import { MetricTiles } from "@/components/Report/MetricTiles"
import { ReportHeader } from "@/components/Report/ReportHeader"
import { VerdictPill } from "@/components/Report/VerdictPill"
import { RulesList } from "@/components/Rules/RulesList"
import { Card } from "@/components/ui/card"
import { getReportScript, getResearchScript, getRulesScript } from "@/lib/agent/source"
import type { Portfolio } from "@/lib/portfolios/types"
import { getOrders, getReport } from "@/lib/report/source"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"
import { getOwnStrategy } from "@/lib/strategies/source"

import { ModelWorkspace } from "./ModelWorkspace"

// How far along the agent's own account of the research is, while it is made up
const RESEARCH_DONE = 2

// A model that is still a draft, as the one page it grows on: the data it needs, put together from the parts that
// each step used to have a page for
export async function DraftWorkspace({ portfolio }: { portfolio: Portfolio }) {
  const [rulesData, report, orders, session, own] = await Promise.all([
    getRules(portfolio),
    getReport(1, portfolio.id),
    getOrders(1, portfolio.id),
    getSession(),
    getOwnStrategy(portfolio.id),
  ])
  // Made here, so what is confirmed and what is bought is kept; the made-up ones are only shown
  const real = Boolean(own)
  const { rules } = rulesData
  // The agent for each point the page can be at: it has what to say about the rules, about the research, and about the report
  const [rulesScript, researchScript, reportScript] = await Promise.all([
    getRulesScript(portfolio, rulesData),
    getResearchScript(portfolio, RESEARCH_DONE),
    getReportScript(portfolio),
  ])

  return (
    <ModelWorkspace
      id={portfolio.id}
      real={real}
      research={own?.research}
      stage={portfolio.stage}
      agents={{
        rules: <AgentWorkspace script={rulesScript} />,
        researching: <AgentWorkspace script={researchScript} />,
        ready: <AgentWorkspace script={reportScript} />,
      }}
      breadcrumb={<PortfolioBreadcrumb name={portfolio.name} />}
      name={portfolio.name}
      brief={portfolio.brief}
      rules={
        <Card>
          <RulesList rules={rules} />
        </Card>
      }
      plan={report.plan}
      verdict={<VerdictPill verdict={report.verdict} />}
      report={
        // One element, not a fragment: a fragment of several children comes across to the client as a list with no keys
        <div className="contents">
          <ReportHeader key="header" report={report} eyebrow={`Strategy results · ${portfolio.name}`} />
          <MetricTiles key="metrics" metrics={report.metrics} />
          <ReportColumn key="sections" report={report} portfolioId={portfolio.id} />
        </div>
      }
      buy={
        <ReviewAndBuy
          orders={orders}
          report={report}
          portfolioId={portfolio.id}
          network={session.network}
          demo={!real}
        />
      }
    />
  )
}
