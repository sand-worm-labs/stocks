import { PiCaretDown, PiTrendDown, PiTrendUp } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { Money } from "@/components/Money/Money"
import { PortfolioIcon } from "@/components/Portfolios/PortfolioIcon"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { ALLOCATION_FILLS } from "@/constants/cards"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatDay } from "@/lib/dates"
import { formatPercent, pluralize } from "@/lib/format"
import type { ModelHoldings } from "@/lib/holdings/groups"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

// One model and the stocks it holds: how much of it each is, what each is worth and how each is doing. It folds shut,
// so a long list of models can be read by their names and what each is worth.
export function ModelHoldingsCard({
  model: { portfolio, index, value, rows },
  open,
}: {
  model: ModelHoldings
  open: boolean
}) {
  const fill = ALLOCATION_FILLS[index % ALLOCATION_FILLS.length]
  // What its stocks have made on what was paid for them
  const gained = rows.reduce((sum, { gain }) => sum + gain, 0)
  const paid = rows.reduce((sum, { cost }) => sum + cost, 0)
  const rate = paid ? gained / paid : 0
  const tone = changeTone(rate)
  const Trend = rate >= 0 ? PiTrendUp : PiTrendDown

  return (
    <Card className="group/card relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* A stripe down the edge in the colour this model has everywhere else */}
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", fill)} />
      <details open={open} className="group">
        <summary className="hover:bg-hover-bg/40 flex cursor-pointer list-none items-center gap-3.5 py-4 pr-5 pl-6 transition-colors [&::-webkit-details-marker]:hidden">
          <PortfolioIcon name={portfolio.name} brief={portfolio.brief} className="size-11" />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppLink route="portfolio" slug={portfolio.id} className="text-lg leading-6 font-medium hover:underline">
              {portfolio.name}
            </AppLink>
            <span className="text-ink-400 text-sm">
              {pluralize(rows.length, "stock")} · created {formatDay(portfolio.createdAt)}
            </span>
          </div>
          <span className="hidden -space-x-2 sm:flex">
            {rows.slice(0, 4).map(({ symbol }) => (
              <StockAvatar key={symbol} symbol={symbol} className="ring-block-surface size-8 ring-2" />
            ))}
          </span>
          <Sparkline series={portfolio.series} className={cn("hidden lg:block", TONE_TEXT_CLASSNAME[tone])} />
          <span className="flex flex-col items-end gap-1">
            <Money value={value} className="text-lg leading-6" />
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm leading-4 font-medium tabular-nums",
                TONE_TEXT_CLASSNAME[tone]
              )}
            >
              <Trend aria-hidden="true" size={14} />
              {formatPercent(rate, { signed: true })}
            </span>
          </span>
          <PiCaretDown aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="px-2 pb-2">
          {rows.map(({ symbol, name, entryPrice, value: held, weight, gain, gainRate }) => (
            <li key={symbol}>
              <AppLink
                route="stock"
                slug={symbol}
                className="hover:bg-hover-bg/60 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
              >
                <StockAvatar symbol={symbol} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{symbol}</span>
                  <span className="text-ink-400 truncate text-sm">
                    {name} · bought at <Money value={entryPrice} />
                  </span>
                </span>
                <span className="hidden w-44 items-center gap-2.5 md:flex">
                  <span className="bg-hover-bg h-2 flex-1 overflow-hidden rounded-full dark:bg-white/10">
                    <span
                      style={{ width: `${weight * 100}%` }}
                      className={cn("animate-grow-x block h-full origin-left rounded-full", fill)}
                    />
                  </span>
                  <span className="text-ink-400 w-11 text-right text-sm tabular-nums">{formatPercent(weight)}</span>
                </span>
                <span className="flex w-28 flex-col items-end">
                  <Money value={held} />
                  <span className={cn("text-sm tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gain)])}>
                    <Money value={gain} signed /> · {formatPercent(gainRate, { signed: true })}
                  </span>
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  )
}
