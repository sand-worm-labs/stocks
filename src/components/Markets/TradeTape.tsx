"use client"

import { PiArrowDownRight, PiArrowUpRight } from "react-icons/pi"
import { Money } from "@/components/Money/Money"

import { useFlip } from "@/hooks/use-flip"
import { useSecondsSince } from "@/hooks/use-seconds-since"

import type { BaseToken } from "@/lib/markets/tokens"
import { cn } from "@/lib/utils"

import { useLiveMarketContext } from "./LiveMarket"
import { TokenAvatar } from "./TokenAvatar"

const SHOWN = 8

function Ago({ at }: { at: number }) {
  const seconds = useSecondsSince(at)
  return (
    <span className="text-ink-300 tabular-nums">
      {seconds < 2 ? "now" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`}
    </span>
  )
}

// The swaps as they land on Base, newest first
export function TradeTape({ tokens }: { tokens: Pick<BaseToken, "address" | "symbol" | "image">[] }) {
  const { trades, swapCount, isConnected } = useLiveMarketContext()
  const list = useFlip<HTMLUListElement>(trades)
  const byAddress = new Map(tokens.map((token) => [token.address.toLowerCase(), token]))

  return (
    <div className="border-border-secondary bg-block-surface dark:border-border-tertiary flex items-stretch overflow-hidden rounded-2xl border">
      <div className="border-border-secondary dark:border-border-tertiary flex flex-none flex-col justify-center gap-0.5 border-r px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
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
        </span>
        <span className="text-ink-400 text-xs tabular-nums">
          {isConnected ? `${swapCount} since you opened this` : "Connecting to Base…"}
        </span>
      </div>

      <ul
        ref={list}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-3 py-3"
        aria-label="Latest swaps"
      >
        {trades.length === 0 && (
          <li data-flip-key="waiting" className="text-ink-400 px-1 text-sm">
            Listening for the next trade…
          </li>
        )}
        {trades.slice(0, SHOWN).map((trade) => {
          const token = byAddress.get(trade.token)
          const Arrow = trade.side === "buy" ? PiArrowUpRight : PiArrowDownRight

          return (
            <li
              key={trade.id}
              data-flip-key={trade.id}
              className="border-border-secondary dark:border-border-tertiary flex flex-none items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm"
            >
              <TokenAvatar image={token?.image} symbol={token?.symbol ?? "?"} className="size-6" />
              <span className="font-medium">{token?.symbol}</span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  trade.side === "buy" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                )}
              >
                <Arrow size={12} aria-hidden="true" />
                {trade.side === "buy" ? "Bought" : "Sold"}
                {trade.usd !== undefined && (
                  <>
                    {" "}
                    <Money value={trade.usd} compact />
                  </>
                )}
              </span>
              {trade.price !== undefined && (
                <span className="text-ink-400 text-xs tabular-nums">
                  at <Money value={trade.price} />
                </span>
              )}
              <Ago at={trade.at} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
