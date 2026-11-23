"use client"

import { Flash } from "@/components/Markets/Flash"
import { Money } from "@/components/Money/Money"
import { BuyDialog } from "@/components/PortfolioDetail/BuyDialog"
import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { TradingModeBadge } from "@/components/Trading/TradingModeBadge"
import { Card } from "@/components/ui/card"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

type HoldingsTableProps = {
  portfolio: Portfolio
  cap: number
  addresses: Record<string, string>
  mode: Session["network"]["mode"]
}

const HEAD = "pb-2 text-xs font-medium text-ink-400"
const CELL = "border-border-secondary dark:border-border-tertiary border-t py-3"
// A stock this close to its cap is drawn as near the line
const NEAR_CAP = 0.9

// What is held, in the order to read it: the stock, how much of the portfolio it is against the cap, the price it was bought at
// and the price now, what it is worth and what it has made, and the way to sell it. Everything but the price paid moves with
// the market.
export function HoldingsTable({ portfolio, cap, addresses, mode }: HoldingsTableProps) {
  const [live] = useLivePortfolios([portfolio], addresses)
  const { holdings, cash } = live ?? portfolio
  const total = portfolioValue(live ?? portfolio) ?? 1

  return (
    <Card className="rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th scope="col" className={cn(HEAD, "text-left")}>
                Token
              </th>
              <th scope="col" className={cn(HEAD, "text-left")}>
                Share <span className="font-normal">· cap {formatPercent(cap)}</span>
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Bought at
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Price now
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Value
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Profit / loss
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                <span className="inline-flex items-center justify-end gap-2">
                  Trade <TradingModeBadge mode={mode} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(({ symbol, units, entryPrice, cost, value }) => {
              const weight = value / total
              const gain = value - cost
              const price = value / units
              return (
                <tr key={symbol}>
                  <td className={CELL}>
                    <span className="flex items-center gap-2 text-xs">
                      <StockAvatar symbol={symbol} className="size-6" />
                      {symbol}
                    </span>
                  </td>
                  <td className={cn(CELL, "min-w-40 pr-4")}>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-hover-bg h-2 flex-1 overflow-hidden rounded-full dark:bg-white/10">
                        <span
                          style={{ width: `${Math.min(weight / cap, 1) * 100}%` }}
                          className={cn(
                            "animate-grow-x block h-full rounded-full",
                            weight / cap >= NEAR_CAP ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                      </span>
                      <span className="w-11 text-right tabular-nums">{formatPercent(weight)}</span>
                    </div>
                  </td>
                  <td className={cn(CELL, "text-ink-400 text-right")}>
                    <Money value={entryPrice} className="justify-end" />
                  </td>
                  <td className={cn(CELL, "text-right")}>
                    <Flash value={price}>
                      <Money value={price} className="justify-end" />
                    </Flash>
                  </td>
                  <td className={cn(CELL, "text-right")}>
                    <Flash value={value}>
                      <Money value={value} className="justify-end" />
                    </Flash>
                  </td>
                  <td className={cn(CELL, "text-right", TONE_TEXT_CLASSNAME[changeTone(gain)])}>
                    <Money value={gain} signed className="justify-end" /> ·{" "}
                    {formatPercent(value / cost - 1, { signed: true })}
                  </td>
                  <td className={cn(CELL, "pl-3 text-right")}>
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <BuyDialog portfolio={live ?? portfolio} symbol={symbol} cap={cap} mode={mode} />
                      <SellDialog portfolio={live ?? portfolio} symbol={symbol} mode={mode} />
                    </span>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td className={CELL}>
                <span className="flex items-center gap-2 text-xs">
                  <StockAvatar symbol="USDC" className="size-6" />
                  USDC cash
                </span>
              </td>
              <td className={cn(CELL, "pr-4")}>
                <div className="flex items-center gap-2.5">
                  <span className="bg-hover-bg h-2 flex-1 overflow-hidden rounded-full dark:bg-white/10">
                    <span
                      style={{ width: `${(cash / total) * 100}%` }}
                      className="animate-grow-x bg-link block h-full rounded-full"
                    />
                  </span>
                  <span className="w-11 text-right tabular-nums">{formatPercent(cash / total)}</span>
                </div>
              </td>
              <td className={CELL} />
              <td className={CELL} />
              <td className={cn(CELL, "text-right")}>
                <Money value={cash} className="justify-end" />
              </td>
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
