import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { PortfolioStatusBadge } from "@/components/Portfolios/PortfolioStatusBadge"
import { formatDay } from "@/lib/dates"
import { pluralize } from "@/lib/format"
import type { Portfolio } from "@/lib/portfolios/types"

import { PortfolioTabs } from "./PortfolioTabs"

export function PortfolioHeader({ portfolio }: { portfolio: Portfolio }) {
  const { id, name, status, startedAt, holdings } = portfolio

  return (
    <header className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={name} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{name}</h1>
          <p className="text-ink-400 flex flex-wrap items-center gap-2 text-sm">
            {startedAt && `Bought ${formatDay(startedAt)} · `}
            {pluralize(holdings.length, "stock")} + cash
          </p>
        </div>
        <PortfolioStatusBadge status={status} />
      </div>
      <PortfolioTabs portfolioId={id} />
    </header>
  )
}
