"use client"

import { useEffect, useRef, useState } from "react"

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion"

// A number that glides to its new value instead of jumping, easing out. Starting where it is, so a number that changes again before it
// has arrived turns round smoothly. With reduced motion it is simply the value.
export function useTween(target: number, ms = 700) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(target)
  const shown = useRef(target)

  useEffect(() => {
    if (reduced) {
      shown.current = target
      setValue(target)
      return
    }
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

  return value
}
