"use client"

import Link from "next/link"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { CARD_SURFACE, CARD_TINTS } from "@/constants/cards"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Starter } from "@/types/onboarding"

import { StarterChart } from "./StarterChart"

type StarterCardProps = { starter: Starter; index: number; className?: string } & (
  | { selected: boolean; onSelect: () => void; href?: never }
  | { href: string; selected?: never; onSelect?: never }
)

export function StarterCard({ starter, index, className, selected, onSelect, href }: StarterCardProps) {
  const { title, oneYearReturn, series, symbols } = starter
  const logos = symbols.slice(0, 5)
  const last = logos.length - 1

  const face = (
    <>
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
    </>
  )
  const style = { "--index": index } as React.CSSProperties
  const classes = cn(
    CARD_SURFACE,
    CARD_TINTS[index % CARD_TINTS.length],
    "h-80",
    selected && "ring-ink-100 ring-2 ring-offset-2 ring-offset-transparent dark:ring-white",
    className
  )

  return href ? (
    <Link href={href} style={style} className={classes}>
      {face}
    </Link>
  ) : (
    <button type="button" aria-pressed={selected} onClick={onSelect} style={style} className={classes}>
      {face}
    </button>
  )
}
