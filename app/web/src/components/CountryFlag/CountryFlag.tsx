"use client"

import { useState } from "react"
import { PiGlobe } from "react-icons/pi"

import { flagUrl } from "@/lib/region/countries"
import { cn } from "@/lib/utils"

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-hover-bg relative flex size-8 flex-none items-center justify-center overflow-hidden rounded-full dark:bg-white/10",
        className
      )}
    >
      {failed ? (
        <PiGlobe className="text-ink-400 size-1/2" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a small image from an open-source set, drawn as it is
        <img
          src={flagUrl(code)}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
