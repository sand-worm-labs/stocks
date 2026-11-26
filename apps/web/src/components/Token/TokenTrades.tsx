"use client"

import { useState } from "react"
import { PiCircleNotch } from "react-icons/pi"

import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Money } from "@/components/Money/Money"
import { Card } from "@/components/ui/card"
import { COLUMNS, ROW, SHOWN, SIDE } from "@/constants/components/token/token-trades"
import { useSecondsSince } from "@/hooks/use-seconds-since"
import { useTween } from "@/hooks/use-tween"
import type { Swap } from "@/lib/markets/swaps"
import { cn } from "@/lib/utils"

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

function Total({ side, trades }: { side: keyof typeof SIDE; trades: Swap[] }) {
  const { label, dot } = SIDE[side]
  const total = worth(trades)
  const shown = useTween(total)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-ink-400 flex items-center gap-1.5 text-xs">
        <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", dot)} />
        {label} · {trades.length}
      </span>
      <Flash value={total}>
        <span className="text-xl font-medium tabular-nums md:text-2xl">
          <Money value={shown} compact />
        </span>
      </Flash>
    </div>
  )
}

export function TokenTrades({ address, symbol }: { address: string; symbol: string }) {
  const { trades, isConnected } = useLiveMarketContext()
  const ofThisToken = (all: Swap[]) => all.filter(({ token }) => token === address.toLowerCase())
  const [initial] = useState(() => new Set(ofThisToken(trades).map(({ id }) => id)))
  const own = ofThisToken(trades).toSorted((a, b) => b.at - a.at)
  const bought = own.filter(({ side }) => side === "buy")
  const sold = own.filter(({ side }) => side === "sell")

  const [up, down] = [worth(bought), worth(sold)]
  const buyShare = up + down ? up / (up + down) : 0.5

  return (
    <section aria-label="Live trades" className="flex flex-col gap-3">
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
          {symbol} on Base · {own.length} {own.length === 1 ? "trade" : "trades"}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 md:p-5">
          <div className="flex items-end justify-between gap-6">
            <Total side="buy" trades={bought} />
            <div className="flex min-w-0 flex-col items-end gap-1 text-right">
              <span className="text-ink-400 text-xs">
                {own.length ? `${Math.round(buyShare * 100)}% buying` : "No trades yet"}
              </span>
              <Total side="sell" trades={sold} />
            </div>
          </div>
          <div
            role="img"
            aria-label={`${Math.round(buyShare * 100)}% bought`}
            className="bg-error flex h-1 overflow-hidden rounded-full"
          >
            <div
              className="bg-emerald-500 transition-[width] duration-700 ease-out"
              style={{ width: `${buyShare * 100}%` }}
            />
          </div>
        </div>

        <div className="border-border-secondary dark:border-border-tertiary border-t">
          <div
            aria-hidden="true"
            className="text-ink-400 grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 px-4 py-2 text-xs font-medium tracking-wide uppercase sm:grid-cols-[5.5rem_1fr_1fr_3rem] md:px-5"
          >
            <span>Side</span>
            <span>Amount</span>
            <span className="hidden sm:block">Price</span>
            <span className="text-right">Time</span>
          </div>

          <ul className="relative overflow-hidden" style={{ height: SHOWN * ROW }}>
            {own.slice(0, SHOWN).map((trade, index) => {
              const { verb, Icon, text } = SIDE[trade.side]

              return (
                <li
                  key={trade.id}
                  style={{ "--index": index } as React.CSSProperties}
                  className={cn(
                    "border-border-secondary dark:border-border-tertiary hover:bg-hover-bg grid border-t transition-colors dark:hover:bg-white/5",
                    initial.has(trade.id) ? "animate-fade-up" : "animate-row-in"
                  )}
                >
                  <div className="overflow-hidden">
                    <div style={{ height: ROW - 1 }} className={cn(COLUMNS, "text-sm")}>
                      <span className={cn("flex items-center gap-1 font-medium", text)}>
                        <Icon size={14} aria-hidden="true" />
                        {verb}
                      </span>
                      <span className="font-medium tabular-nums">
                        {trade.usd === undefined ? "—" : <Money value={trade.usd} />}
                      </span>
                      <span className="text-ink-400 hidden tabular-nums sm:block">
                        {trade.price === undefined ? "—" : <Money value={trade.price} />}
                      </span>
                      <span className="text-right">
                        <Ago at={trade.at} />
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
            {own.length === 0 && (
              <li className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
                <span role="status" className="text-ink-200 flex items-center gap-2.5 text-sm font-medium">
                  {isConnected ? (
                    <span aria-hidden="true" className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                  ) : (
                    <PiCircleNotch aria-hidden="true" className="text-ink-400 animate-spin" size={14} />
                  )}
                  {isConnected ? `Listening for ${symbol} trades` : "Connecting to Base…"}
                </span>
                <span className="text-ink-400 text-xs">
                  {isConnected
                    ? "Each one shows up here the moment it happens on Base."
                    : "Trades will show up here once it is connected."}
                </span>
              </li>
            )}
          </ul>
        </div>
      </Card>
    </section>
  )
}
