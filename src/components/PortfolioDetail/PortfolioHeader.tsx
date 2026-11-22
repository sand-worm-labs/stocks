import type { ReactNode } from "react"

import { PortfolioStatusBadge } from "@/components/Portfolios/PortfolioStatusBadge"
import { formatDay } from "@/lib/dates"
import { pluralize } from "@/lib/format"
import type { Portfolio } from "@/lib/portfolios/types"

import { type PortfolioTab, PortfolioTabs } from "./PortfolioTabs"

type PortfolioHeaderProps = { portfolio: Portfolio; current: PortfolioTab; actions?: ReactNode; mode: string }

export function PortfolioHeader({ portfolio, current, actions, mode }: PortfolioHeaderProps) {
  const { id, name, status, startedAt, holdings } = portfolio

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{name}</h1>
          <p className="text-ink-400 flex flex-wrap items-center gap-2 text-sm">
            <PortfolioStatusBadge status={status} />
            <span>
              {startedAt && `Bought ${formatDay(startedAt)} · `}
              {pluralize(holdings.length, "stock")} + cash · {mode}
            </span>
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <PortfolioTabs portfolioId={id} current={current} />
    </header>
  )
}
