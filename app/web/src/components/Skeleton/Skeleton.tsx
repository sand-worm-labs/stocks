import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

type SkeletonProps = { className?: string; style?: CSSProperties }

export function Skeleton({ className, style }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton rounded-lg", className)} style={style} />
}

// A line of text. The box is as tall as the line the real text takes and the bar a little shorter, so whatever follows
// sits where it will when the text arrives. The width comes from `className`.
export function SkeletonText({ lineHeight = 20, className }: { lineHeight?: number; className?: string }) {
  return (
    <div aria-hidden="true" style={{ height: lineHeight }} className={cn("flex flex-none items-center", className)}>
      <div className="skeleton h-[70%] w-full rounded-md" />
    </div>
  )
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("size-10 flex-none rounded-full", className)} />
}

export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[34px] w-20 flex-none rounded-full", className)} />
}
