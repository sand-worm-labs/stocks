"use client"

import { cn } from "@/lib/utils"

import { useLiveMarketContext } from "./LiveMarket"

export function LiveBadge({ compact = false }: { compact?: boolean }) {
  const { isConnected } = useLiveMarketContext()

  return (
    <span
      className={cn(
        "border-border bg-hover-bg dark:border-border-tertiary inline-flex items-center rounded-full border font-medium tracking-wide uppercase dark:bg-white/5",
        compact ? "gap-1.5 px-2 py-px text-[10px]" : "gap-2 px-3 py-1 text-xs",
        isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-ink-400"
      )}
    >
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
      {isConnected ? "Live" : "Connecting"}
    </span>
  )
}
