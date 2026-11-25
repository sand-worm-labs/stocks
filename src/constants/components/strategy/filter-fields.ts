import type { Indicator } from "@/types/strategy"

export const FIELD =
  "nodrag nopan border-hover-border bg-hover-bg focus-visible:ring-mark rounded-lg border text-[13px] font-medium outline-none focus-visible:ring-2 dark:bg-white/10"

export const INDICATORS: { kind: Indicator["kind"]; label: string }[] = [
  { kind: "return", label: "return" },
  { kind: "sma-return", label: "average daily move" },
  { kind: "rsi", label: "RSI" },
  { kind: "volatility", label: "volatility" },
  { kind: "drawdown", label: "worst fall" },
  { kind: "sma", label: "average price" },
  { kind: "ema", label: "weighted average price" },
  { kind: "std-price", label: "price spread" },
  { kind: "price", label: "price" },
]

export const DEFAULT_DAYS = 30
