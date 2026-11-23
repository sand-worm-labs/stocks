import { TRADING_MODE_LABEL } from "@/constants/portfolio"
import type { Session } from "@/lib/session/types"
import { cn } from "@/lib/utils"

type TradingModeBadgeProps = {
  mode: Session["network"]["mode"]
  // "Paper trading" in full, where there is room, and "Paper" where there isn't
  long?: boolean
  className?: string
}

// Whether the money is real. Paper trading is amber and dashed, like a practice stamp, so nobody takes it for the real
// thing; trading with a wallet is green.
export function TradingModeBadge({ mode, long, className }: TradingModeBadgeProps) {
  const paper = mode === "paper"

  return (
    <span
      title={paper ? "Paper trading: practice trades with live prices, no real money" : "Trading with your wallet"}
      className={cn(
        "font-tertiary inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] leading-4 font-medium tracking-wide whitespace-nowrap uppercase",
        paper
          ? "border-dashed border-amber-500/70 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", paper ? "bg-amber-500" : "bg-emerald-500")} />
      {long ? (paper ? "Paper trading" : "Live trading") : TRADING_MODE_LABEL[mode]}
    </span>
  )
}
