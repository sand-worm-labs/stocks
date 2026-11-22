"use client"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { formatPercent } from "@/lib/format"
import type { Starter } from "@/lib/onboarding/types"
import { cn } from "@/lib/utils"

import { StarterChart } from "./StarterChart"

// Each card in its own soft colour, fading out at the bottom
const TINTS = [
  "from-rose-100 via-rose-50 to-rose-50/40 dark:from-rose-950/50 dark:via-rose-950/20 dark:to-transparent",
  "from-emerald-100 via-emerald-50 to-emerald-50/40 dark:from-emerald-950/50 dark:via-emerald-950/20 dark:to-transparent",
  "from-indigo-100 via-indigo-50 to-indigo-50/40 dark:from-indigo-950/50 dark:via-indigo-950/20 dark:to-transparent",
]

type StarterCardProps = { starter: Starter; index: number; selected: boolean; onSelect: () => void }

// A brief to start from: how its backtest did over the last year, the stocks in it, and its name. Choosing one opens
// the new portfolio with that brief already written.
export function StarterCard({ starter, index, selected, onSelect }: StarterCardProps) {
  const { title, oneYearReturn, series, symbols } = starter
  const logos = symbols.slice(0, 5)
  const last = logos.length - 1

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{ "--index": index } as React.CSSProperties}
      className={cn(
        "animate-fade-up bg-gradient-to-b text-left",
        TINTS[index % TINTS.length],
        "border-border-secondary dark:border-border-tertiary flex h-80 w-full flex-col overflow-hidden rounded-[28px] border shadow-[0_10px_40px_-18px_rgba(24,39,75,0.25)] transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5",
        selected && "ring-ink-100 ring-2 ring-offset-2 ring-offset-transparent dark:ring-white"
      )}
    >
      <div className="flex items-baseline justify-between px-5 pt-5">
        <span className="text-2xl leading-none font-normal text-emerald-700 tabular-nums dark:text-emerald-400">
          {formatPercent(oneYearReturn, { signed: true })}
        </span>
        <span className="text-ink-400 text-[13px]">1 year return</span>
      </div>
      <div className="text-ink-300 mt-2 h-[72px] w-full">
        <StarterChart series={series} />
      </div>
      <div className="flex flex-1 items-center justify-center gap-2.5 px-4">
        {logos.map((symbol, i) => {
          const edge = logos.length > 2 && (i === 0 || i === last)
          return (
            <span
              key={symbol}
              className={cn(
                "rounded-full shadow-[0_8px_24px_-8px_rgba(24,39,75,0.35)]",
                edge ? "opacity-75 blur-[0.5px]" : ""
              )}
            >
              <StockAvatar symbol={symbol} className={edge ? "size-9" : "size-12"} />
            </span>
          )
        })}
      </div>
      <h3 className="px-5 pb-5 text-xl leading-6 font-normal">{title}</h3>
    </button>
  )
}
