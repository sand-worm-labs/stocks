import type { ReactNode } from "react"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { TRADING_MODE_LABEL } from "@/constants/portfolio"
import { getLiveScript } from "@/lib/agent/source"
import type { Portfolio } from "@/lib/portfolios/types"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"

import { AddFundsDialog } from "./AddFundsDialog"
import { PortfolioHeader } from "./PortfolioHeader"
import type { PortfolioTab } from "./PortfolioTabs"

// Everything around a live portfolio's pages: where it sits, who it is, the tabs between its pages and the agent
export async function PortfolioShell({
  portfolio,
  current,
  children,
}: {
  portfolio: Portfolio
  current: PortfolioTab
  children: ReactNode
}) {
  const [session, { rules }, script] = await Promise.all([getSession(), getRules(portfolio), getLiveScript(portfolio)])
  const { mode, chain } = session.network

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout aside={<AgentWorkspace script={script} />} agent="on-demand">
        <PortfolioHeader
          portfolio={portfolio}
          current={current}
          mode={`${TRADING_MODE_LABEL[mode]} · ${chain}`}
          actions={<AddFundsDialog portfolio={portfolio} cap={maxWeightOf(rules) ?? 1} />}
        />
        {children}
      </FlowLayout>
    </div>
  )
}
