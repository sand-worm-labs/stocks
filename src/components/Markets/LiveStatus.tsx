"use client"

import { useSecondsSince } from "@/hooks/use-seconds-since"
import { cn } from "@/lib/utils"

import { useLiveMarketContext } from "./LiveMarket"

export function LiveStatus() {
  const { isConnected, updatedAt, swapCount } = useLiveMarketContext()
  const seconds = useSecondsSince(updatedAt)

  return (
    <p className="text-ink-400 flex items-center justify-end gap-2 text-xs" aria-live="off">
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
      {isConnected
        ? `Streaming from Base · ${swapCount} ${swapCount === 1 ? "swap" : "swaps"} · prices checked ${seconds < 2 ? "just now" : `${seconds}s ago`}`
        : "Connecting to Base…"}
    </p>
  )
}
