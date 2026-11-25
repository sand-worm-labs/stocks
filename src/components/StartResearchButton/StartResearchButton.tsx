"use client"

import { PiArrowRight, PiCircleNotch } from "react-icons/pi"

import { useStartStrategy } from "@/components/Brief/useStartStrategy"
import { buttonVariants } from "@/components/Button/Button"
import { briefFromPicks } from "@/lib/brief/fromPicks"
import { underlyingTicker } from "@/lib/markets/stock"
import { cn } from "@/lib/utils"

export function StartResearchButton({ symbol, className }: { symbol: string; className?: string }) {
  const { start, busy } = useStartStrategy()

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => start(briefFromPicks([underlyingTicker(symbol)]))}
      className={cn(
        buttonVariants({ intent: "dark", size: "compact" }),
        "rounded-xl disabled:cursor-wait disabled:opacity-70",
        className
      )}
    >
      Start research
      {busy ? (
        <PiCircleNotch size={16} aria-hidden="true" className="animate-spin" />
      ) : (
        <PiArrowRight size={16} aria-hidden="true" />
      )}
    </button>
  )
}
