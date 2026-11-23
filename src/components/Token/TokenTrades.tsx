"use client"

import { PiArrowDownRight, PiArrowUpRight } from "react-icons/pi"

import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Money } from "@/components/Money/Money"
import { Card } from "@/components/ui/card"
import { useSecondsSince } from "@/hooks/use-seconds-since"

import type { Swap } from "@/lib/markets/swaps"
import { cn } from "@/lib/utils"

const SHOWN = 10

const SIDES = [
  {
    side: "buy",
    label: "Bought",
    Icon: PiArrowUpRight,
    text: "text-emerald-700 dark:text-emerald-400",
    rule: "border-emerald-500/40",
    box: "border-emerald-500/30 bg-emerald-500/5",
  },
  {
    side: "sell",
    label: "Sold",
    Icon: PiArrowDownRight,
    text: "text-red-700 dark:text-red-400",
    rule: "border-red-500/40",
    box: "border-red-500/30 bg-red-500/5",
  },
] as const

function Ago({ at }: { at: number }) {
  const seconds = useSecondsSince(at)
  const label =
    seconds < 2
      ? "now"
      : seconds < 60
        ? `${seconds}s`
        : seconds < 3600
          ? `${Math.floor(seconds / 60)}m`
          : `${Math.floor(seconds / 3600)}h`

  return <span className="text-ink-400 text-xs tabular-nums">{label}</span>
}

const worth = (trades: Swap[]) => trades.reduce((sum, { usd = 0 }) => sum + usd, 0)

// Buying on one side and selling on the other, in one frame: the totals, a bar that tips towards whoever is winning,
// and each side's trades as they land
export function TokenTrades({ address, symbol }: { address: string; symbol: string }) {
  const { trades, isConnected } = useLiveMarketContext()
  const own = trades.filter(({ token }) => token === address.toLowerCase())
  const sides = SIDES.map((side) => ({ ...side, trades: own.filter((trade) => trade.side === side.side) }))

  const [bought, sold] = sides.map(({ trades }) => worth(trades)) as [number, number]
  const buyShare = bought + sold ? bought / (bought + sold) : 0.5

  return (
    <section aria-label="Live trades" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <span aria-hidden="true" className="relative flex size-2">
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full opacity-60",
                isConnected && "animate-ping bg-emerald-500"
              )}
            />
            <span
              className={cn("relative inline-flex size-2 rounded-full", isConnected ? "bg-emerald-500" : "bg-ink-300")}
            />
          </span>
          Live trades
        </h2>
        <span className="text-ink-400 text-xs">
          {symbol} on Base · {own.length} trades
        </span>
      </div>

      <div
        className="flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={`${Math.round(buyShare * 100)}% bought`}
      >
        <div
          className="bg-emerald-500 transition-[width] duration-700 ease-out"
          style={{ width: `${buyShare * 100}%` }}
        />
        <div className="flex-1 bg-red-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {sides.map(({ side, label, Icon, text, rule, box, trades: sideTrades }) => (
          <Card key={side} aria-label={label} className={cn("flex min-w-0 flex-col p-4 md:p-5", box)}>
            <div className={cn("flex flex-col gap-0.5 border-b pb-3", rule)}>
              <span className={cn("flex items-center gap-1.5 text-sm font-medium", text)}>
                <Icon size={14} aria-hidden="true" />
                {label} · {sideTrades.length}
              </span>
              <Flash value={worth(sideTrades)}>
                <span className={cn("text-2xl font-medium tabular-nums md:text-3xl", text)}>
                  <Money value={worth(sideTrades)} compact />
                </span>
              </Flash>
            </div>
            <ul className="flex flex-col">
              {sideTrades.length === 0 && <li className="text-ink-400 py-3 text-sm">None yet</li>}
              {sideTrades.slice(0, SHOWN).map((trade, i) => (
                <li
                  key={`${trade.at}-${trade.usd}-${i}`}
                  className="animate-slide-in border-border-secondary dark:border-border-tertiary flex flex-wrap items-baseline justify-between gap-x-3 border-t py-2.5 text-sm first:border-t-0"
                >
                  <span className="font-medium tabular-nums">
                    {trade.usd === undefined ? "—" : <Money value={trade.usd} />}
                  </span>
                  <Ago at={trade.at} />
                  <span className="text-ink-400 w-full text-xs tabular-nums">
                    {trade.price === undefined ? null : (
                      <>
                        at <Money value={trade.price} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  )
}
