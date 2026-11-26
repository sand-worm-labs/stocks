"use client"

import Image from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils"

type TokenAvatarProps = { image?: string; symbol: string; className?: string }

export function TokenAvatar({ image, symbol, className }: TokenAvatarProps) {
  const [hasImage, setHasImage] = useState(!!image)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-inputBg text-ink-200 relative flex size-8 flex-none items-center justify-center overflow-hidden rounded-full text-xs font-medium dark:bg-white/10",
        className
      )}
    >
      {image && hasImage ? (
        <Image
          src={image}
          alt=""
          fill
          unoptimized
          sizes="40px"
          className="object-cover"
          onError={() => setHasImage(false)}
        />
      ) : (
        symbol.charAt(0)
      )}
    </span>
  )
}
