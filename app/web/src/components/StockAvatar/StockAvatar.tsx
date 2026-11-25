"use client"

import Image from "next/image"
import { memo, useState } from "react"

import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { stockLogoUrl } from "@/lib/markets/stock"
import { cn } from "@/lib/utils"

// Memoised: Next's image sets its own src again every time it is drawn, so a logo drawn again for nothing can blink
export const StockAvatar = memo(function StockAvatar({ symbol, className }: { symbol: string; className?: string }) {
  const [hasLogo, setHasLogo] = useState(true)
  if (symbol === "$" || symbol === "USDC") return <UsdcMark className={cn("size-8", className)} />

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
})
