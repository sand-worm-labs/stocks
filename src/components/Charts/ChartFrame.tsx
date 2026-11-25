"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

import { ChartLoader } from "@/components/Charts/ChartLoader"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

type ChartFrameProps = {
  height: number
  label: string
  children: (animate: boolean) => ReactNode
}

export function ChartFrame({ height, label, children }: ChartFrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: "0px 0px -80px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} role="img" aria-label={label} style={{ height }} className="relative w-full">
      {visible ? children(!reduced) : <ChartLoader />}
    </div>
  )
}
