"use client"

import { PiChartLineUp, PiPiggyBank, PiWallet } from "react-icons/pi"

import { CountUp } from "@/components/Home/CountUp"
import { ProfitLine } from "@/components/Money/ProfitLine"
import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import { deposited, profit } from "@/lib/portfolios/performance"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import type { Portfolio } from "@/types/portfolios"

type PortfolioHeroLiveProps = { portfolio: Portfolio; addresses: Record<string, string> }

export function PortfolioHeroLive({ portfolio, addresses }: PortfolioHeroLiveProps) {
  const [live] = useLivePortfolios([portfolio], addresses)
  const now = live ?? portfolio
  const value = portfolioValue(now) ?? 0
  const gained = profit(now)
  const best = now.holdings
    .map(({ symbol, value: held, cost }) => ({ symbol, rate: cost ? held / cost - 1 : 0 }))
    .sort((a, b) => b.rate - a.rate)[0]

  const tiles = [
    { label: "Invested", amount: deposited(now), icon: PiPiggyBank },
    { label: "In stocks", amount: value - now.cash, icon: PiChartLineUp },
    { label: "Cash ready", amount: now.cash, icon: PiWallet },
  ]

  return (
    <Card className="overflow-hidden bg-[radial-gradient(60%_70%_at_100%_0%,var(--mark-soft),transparent),radial-gradient(45%_50%_at_0%_100%,rgba(16,185,129,0.08),transparent)]">
      <div className="flex flex-col gap-4 p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <span className="text-ink-400 text-sm">Value</span>
          <span className="flex items-center gap-3 text-[48px] leading-[52px] font-normal tracking-tight">
            <UsdcMark className="size-9 flex-none" />
            <CountUp value={value} />
          </span>
          <ProfitLine profit={gained} put={deposited(now)} className="mt-1" />
        </div>

        <dl className="flex flex-wrap gap-2.5">
          {tiles.map(({ label, amount, icon: Icon }, i) => (
            <div
              key={label}
              style={{ "--index": i } as React.CSSProperties}
              className="animate-fade-up border-border-secondary bg-block-surface/70 dark:border-border-tertiary flex items-center gap-3 rounded-2xl border py-2.5 pr-4 pl-2.5 backdrop-blur-sm"
            >
              <span
                aria-hidden="true"
                className="bg-primary-tint-75 text-primary dark:bg-primary/15 flex size-9 flex-none items-center justify-center rounded-xl"
              >
                <Icon size={18} />
              </span>
              <div className="flex flex-col">
                <dt className="text-ink-400 text-xs">{label}</dt>
                <dd className="flex items-center gap-1.5 text-lg leading-6">
                  <UsdcMark className="size-4" />
                  <CountUp value={amount} />
                </dd>
              </div>
            </div>
          ))}
          {best && (
            <div
              style={{ "--index": tiles.length } as React.CSSProperties}
              className="animate-fade-up border-border-secondary bg-block-surface/70 dark:border-border-tertiary flex items-center gap-3 rounded-2xl border py-2.5 pr-4 pl-2.5 backdrop-blur-sm"
            >
              <StockAvatar symbol={best.symbol} className="size-9" />
              <div className="flex flex-col">
                <dt className="text-ink-400 text-xs">Best stock</dt>
                <dd className="flex items-center gap-2 text-lg leading-6">
                  {best.symbol}
                  <span className={cn("text-sm tabular-nums", TONE_TEXT_CLASSNAME[changeTone(best.rate)])}>
                    {formatPercent(best.rate, { signed: true })}
                  </span>
                </dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </Card>
  )
}
