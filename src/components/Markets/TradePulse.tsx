"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const SHOWN_MS = 2500

// A dot that pings in the colour of a trade for a moment after one lands
export function TradePulse({ at, side }: { at?: number; side?: "buy" | "sell" }) {
  const [isShown, setIsShown] = useState(false)

  useEffect(() => {
    if (!at) return

    setIsShown(true)
    const timer = setTimeout(() => setIsShown(false), SHOWN_MS)
    return () => clearTimeout(timer)
  }, [at])

  if (!isShown) return null

  const colour = side === "buy" ? "bg-emerald-500" : "bg-red-500"

  return (
    <span aria-hidden="true" className="relative flex size-2 flex-none">
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", colour)} />
      <span className={cn("relative inline-flex size-2 rounded-full", colour)} />
    </span>
  )
}
