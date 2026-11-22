"use client"

import { cn } from "@/lib/utils"

import { Flash } from "./Flash"
import { useLiveMarketContext } from "./LiveMarket"

export function LiveBadge({ compact = false }: { compact?: boolean }) {
  const { isConnected, block } = useLiveMarketContext()

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium tracking-wide uppercase transition-colors",
        compact ? "gap-1.5 px-2 py-px text-[10px]" : "px-3 py-1 text-xs",
        isConnected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border text-ink-400 dark:border-border-tertiary"
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
      {block !== undefined && (
        <Flash value={block}>
          <span className="normal-case tabular-nums">Block {block.toLocaleString("en-US")}</span>
        </Flash>
      )}
    </span>
  )
}
