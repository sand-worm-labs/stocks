import { cn } from "@/lib/utils"

export const LEAD = "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase"

export const WORD = cn(LEAD, "w-[5.5rem] text-center")

export const BLOCK_WORD = {
  asset: "Stock",
  cash: "Cash",
  filter: "Filter",
  group: "Split",
  rebalance: "Rebalance",
} as const

export const SHARE = "bg-hover-bg text-ink-100 normal-case tabular-nums dark:bg-white/10"

export const RULE = "border-border-secondary dark:border-border-tertiary border-b"

export const ROW = "flex items-baseline gap-2.5 py-1.5 text-[15px] leading-6"
