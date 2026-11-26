"use client"

import Image from "next/image"
import { useState } from "react"

import { SourceMark } from "@/components/SourceLink/SourceMark"
import { faviconUrl, sourceDomain } from "@/lib/sources/logo"
import { cn } from "@/lib/utils"

// A source's real logo when its site has one, and the lettered mark when it hasn't
export function SourceLogo({ name, url, className }: { name: string; url?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const domain = sourceDomain(name, url)

  if (!domain || failed) return <SourceMark name={name} className={cn("size-6 text-[9px]", className)} />

  return (
    <Image
      src={faviconUrl(domain)}
      alt=""
      width={24}
      height={24}
      unoptimized
      onError={() => setFailed(true)}
      className={cn("size-6 flex-none rounded-md bg-white object-contain p-0.5 ring-1 ring-black/10", className)}
    />
  )
}
