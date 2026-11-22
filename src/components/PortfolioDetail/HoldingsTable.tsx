import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

type HoldingsTableProps = { portfolio: Portfolio; cap: number }

const HEAD = "pb-2 text-xs font-medium text-ink-400"
const CELL = "border-border-secondary dark:border-border-tertiary border-t py-3"
// A stock this close to its cap is drawn as near the line
const NEAR_CAP = 0.9

function headline(holdings: Portfolio["holdings"]) {
  const down = holdings.filter(({ value, cost }) => value < cost)
  if (!down.length) return "Everything is up."
  return down.length === 1
    ? `${down[0]?.symbol} is the only one down.`
    : `${down.length} of ${holdings.length} are down.`
}

// What is held, how much of the portfolio each is against the cap the rules set, and how each is doing
export function HoldingsTable({ portfolio, cap }: HoldingsTableProps) {
  const { holdings, cash } = portfolio
  const total = portfolioValue(portfolio) ?? 1

  return (
    <Card className="flex flex-col gap-3.5 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <h3 className="text-[17px] font-medium">{headline(holdings)}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th scope="col" className={cn(HEAD, "text-left")}>
                Token
              </th>
              <th scope="col" className={cn(HEAD, "text-left")}>
                Share of portfolio <span className="font-normal">· cap {formatPercent(cap)}</span>
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Value
              </th>
              <th scope="col" className={cn(HEAD, "text-right")}>
                Profit / loss
              </th>
              <th scope="col" className={HEAD}>
                <span className="sr-only">Sell</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(({ symbol, cost, value }) => {
              const weight = value / total
              const gain = value - cost
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
                            weight / cap >= NEAR_CAP ? "bg-amber-500" : "bg-primary"
                          )}
                        />
                      </span>
                      <span className="w-11 text-right tabular-nums">{formatPercent(weight)}</span>
                    </div>
                  </td>
                  <td className={cn(CELL, "text-right tabular-nums")}>{formatAmount(value)}</td>
                  <td className={cn(CELL, "text-right tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gain)])}>
                    {formatSignedAmount(gain)} · {formatPercent(value / cost - 1, { signed: true })}
                  </td>
                  <td className={cn(CELL, "pl-3 text-right")}>
                    <SellDialog portfolio={portfolio} symbol={symbol} />
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
              <td className={cn(CELL, "text-right tabular-nums")}>{formatAmount(cash)}</td>
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
