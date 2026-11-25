"use client"

import { useEffect, useRef, useState } from "react"

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion"

export function useTween(target: number, ms = 700) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(target)
  const shown = useRef(target)

  useEffect(() => {
    if (reduced) return
    const from = shown.current
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min((now - started) / ms, 1)
      shown.current = from + (target - from) * (1 - (1 - t) ** 3)
      setValue(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms, reduced])

  return reduced ? target : value
}
