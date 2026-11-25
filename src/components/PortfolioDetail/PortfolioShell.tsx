import type { ReactNode } from "react"

import { AgentWorkspace } from "@/components/Agent/AgentWorkspace"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { getLiveScript } from "@/lib/agent/source"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"
import type { Portfolio } from "@/types/portfolios"

import type { PortfolioTab } from "@/types/ui"
import { AddFundsDialog } from "./AddFundsDialog"
import { PortfolioHeader } from "./PortfolioHeader"
import { SellDialog } from "./SellDialog"

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
          mode={mode}
          chain={chain}
          actions={
            <>
              <AddFundsDialog portfolios={[portfolio]} cap={maxWeightOf(rules) ?? 1} />
              <SellDialog portfolio={portfolio} pickable mode={mode} />
            </>
          }
        />
        {children}
      </FlowLayout>
    </div>
  )
}
