"use client"

import { useEffect, useState } from "react"

import { SHOWN_MS } from "@/constants/components/markets/trade-pulse"
import { cn } from "@/lib/utils"

export function TradePulse({ at, side }: { at?: number; side?: "buy" | "sell" }) {
  const [over, setOver] = useState<number>()

  useEffect(() => {
    if (!at) return
    const timer = setTimeout(() => setOver(at), SHOWN_MS)
    return () => clearTimeout(timer)
  }, [at])

  if (!at || over === at) return null

  const colour = side === "buy" ? "bg-emerald-500" : "bg-red-500"

  return (
    <span aria-hidden="true" className="relative flex size-2 flex-none">
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", colour)} />
      <span className={cn("relative inline-flex size-2 rounded-full", colour)} />
    </span>
  )
}
