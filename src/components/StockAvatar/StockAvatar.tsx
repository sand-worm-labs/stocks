"use client"

import Image from "next/image"
import { useState } from "react"

import { stockLogoUrl } from "@/lib/markets/stock"
import { cn } from "@/lib/utils"

export function StockAvatar({ symbol, className }: { symbol: string; className?: string }) {
  const [hasLogo, setHasLogo] = useState(true)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-inputBg text-ink-200 relative flex size-8 flex-none items-center justify-center overflow-hidden rounded-full text-xs font-medium dark:bg-white/10",
        className
      )}
    >
      {hasLogo ? (
        <Image
          src={stockLogoUrl(symbol)}
          alt=""
          fill
          unoptimized
          sizes="40px"
          className="bg-white object-contain p-1"
          onError={() => setHasLogo(false)}
        />
      ) : (
        symbol.charAt(0)
      )}
    </span>
  )
}
