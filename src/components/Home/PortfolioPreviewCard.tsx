import { PiArrowRight } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { PortfolioStatusBadge } from "@/components/Portfolios/PortfolioStatusBadge"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { PORTFOLIO_STATUS } from "@/constants/portfolio"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { portfolioValue, rulesText } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"

const LINK_CLASSNAME = "flex h-full flex-col gap-4 p-4"

export function PortfolioPreviewCard({ portfolio }: { portfolio: Portfolio }) {
  const { name, status, holdings, weekChange = 0, worstDip = 0, series, note } = portfolio
  const value = portfolioValue(portfolio)
  const tone = changeTone(weekChange)

  return (
    <Card className="hover:border-primary transition-colors">
      <AppLink route={PORTFOLIO_STATUS[status].route} slug={portfolio.id} className={LINK_CLASSNAME}>
        <div className="flex items-start justify-between gap-3">
          <span className="font-medium">{name}</span>
          <PortfolioStatusBadge status={status} />
        </div>

        {value === undefined ? (
          <>
            <p className="text-ink-400 text-sm">{note}</p>
            <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
              Confirm rules <PiArrowRight aria-hidden="true" />
            </span>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-2xl font-medium tabular-nums">
                  {formatAmount(value)} <span className="text-ink-400 text-sm font-normal">USDC</span>
                </span>
                <span className="text-xs">
                  <span className={TONE_TEXT_CLASSNAME[tone]}>{formatPercent(weekChange, { signed: true })}</span>
                  <span className="text-ink-400"> · worst dip {formatPercent(worstDip, { signed: true })}</span>
                </span>
              </div>
              <Sparkline series={series} className={TONE_TEXT_CLASSNAME[tone]} />
            </div>
            <div className="mt-auto flex items-center gap-2">
              <span className="flex -space-x-2">
                {holdings.map(({ symbol }) => (
                  <StockAvatar key={symbol} symbol={symbol} className="ring-block-surface size-6 ring-2" />
                ))}
                <StockAvatar symbol="$" className="ring-block-surface size-6 ring-2" />
              </span>
              <span className="text-ink-400 text-xs">
                {pluralize(holdings.length, "stock")} + cash · rules {rulesText(portfolio)}
              </span>
            </div>
          </>
        )}
      </AppLink>
    </Card>
  )
}
