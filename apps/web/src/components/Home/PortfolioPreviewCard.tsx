import { AppLink } from "@/components/AppLink/AppLink"
import { StarterChart } from "@/components/Onboarding/StarterChart"
import { PortfolioIcon } from "@/components/Portfolios/PortfolioIcon"
import { PortfolioStatusBadge } from "@/components/Portfolios/PortfolioStatusBadge"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import { CARD_SURFACE, CARD_TINTS } from "@/constants/cards"
import { PORTFOLIO_STATUS } from "@/constants/portfolio"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatDay } from "@/lib/dates"
import { formatPercent } from "@/lib/format"
import { returnOnDeposit } from "@/lib/portfolios/performance"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import type { Portfolio } from "@/types/portfolios"
import type { Session } from "@/types/session"

export function PortfolioPreviewCard({
  portfolio,
  index,
  mode,
}: {
  portfolio: Portfolio
  index: number
  mode: Session["network"]["mode"]
}) {
  const { name, status, holdings, startedAt, createdAt, series, note } = portfolio
  const isBought = portfolioValue(portfolio) !== undefined
  const gained = returnOnDeposit(portfolio)

  return (
    <AppLink
      route={PORTFOLIO_STATUS[status].route}
      slug={portfolio.id}
      className={cn(CARD_SURFACE, CARD_TINTS[index % CARD_TINTS.length], "h-72")}
    >
      <div className="flex items-start justify-between px-5 pt-5">
        <PortfolioIcon name={name} brief={portfolio.brief} />
        {isBought ? (
          <span className="flex flex-col items-end gap-1">
            <span className={cn("text-2xl leading-none tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gained)])}>
              {formatPercent(gained, { signed: true })}
            </span>
            <span className="text-ink-400 text-[13px]">since {formatDay(startedAt ?? createdAt)}</span>
          </span>
        ) : (
          <PortfolioStatusBadge status={status} />
        )}
      </div>
      {isBought ? (
        <>
          <div className="text-ink-300 mt-2 h-[64px] w-full">
            <StarterChart series={series} />
          </div>
          <div className="flex flex-1 items-center justify-center -space-x-2 px-4">
            {holdings.map(({ symbol }) => (
              <StockAvatar key={symbol} symbol={symbol} className="ring-block-surface size-10 ring-2" />
            ))}
            <StockAvatar symbol="$" className="ring-block-surface size-10 ring-2" />
          </div>
        </>
      ) : (
        <p className="text-ink-400 flex-1 px-5 pt-4 text-sm">{note}</p>
      )}
      <div className="flex items-end justify-between gap-3 px-5 pb-5">
        <h3 className="text-xl leading-6 font-normal">{name}</h3>
        {isBought && <TradingModeBadge mode={mode} long />}
        {!isBought && <span className="text-primary flex-none text-sm font-medium">Confirm rules →</span>}
      </div>
    </AppLink>
  )
}
