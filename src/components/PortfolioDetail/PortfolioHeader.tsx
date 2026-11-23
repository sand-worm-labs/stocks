import type { ReactNode } from "react"

import { PortfolioIcon } from "@/components/Portfolios/PortfolioIcon"
import { PortfolioStatusBadge } from "@/components/Portfolios/PortfolioStatusBadge"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import { formatDay } from "@/lib/dates"
import { pluralize } from "@/lib/format"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"

import { type PortfolioTab, PortfolioTabs } from "./PortfolioTabs"

type PortfolioHeaderProps = {
  portfolio: Portfolio
  current: PortfolioTab
  actions?: ReactNode
  mode: Session["network"]["mode"]
  chain: string
}

// Who the portfolio is: its icon and name, whether it is live and whether the trading is paper, when it was bought and
// where, and the tabs between its pages
export function PortfolioHeader({ portfolio, current, actions, mode, chain }: PortfolioHeaderProps) {
  const { id, name, brief, status, startedAt, holdings } = portfolio

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <PortfolioIcon name={name} brief={brief} className="size-14 rounded-2xl" size={26} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl leading-8 font-medium md:text-[32px] md:leading-10">{name}</h1>
            <p className="text-ink-400 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
              <PortfolioStatusBadge status={status} />
              <TradingModeBadge mode={mode} long />
              <span>
                {startedAt && `Bought ${formatDay(startedAt)} · `}
                {pluralize(holdings.length, "stock")} + cash · {chain}
              </span>
            </p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <PortfolioTabs portfolioId={id} current={current} />
    </header>
  )
}
