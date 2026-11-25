"use client"

import { useEffect, useRef, useState } from "react"
import { PiCaretDownFill, PiCaretUpFill } from "react-icons/pi"

import { DURATION_MS, LIT_MS, MIN_MOVE, STARTS_AT } from "@/constants/components/home/count-up"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { formatAmount } from "@/lib/format"
import { cn } from "@/lib/utils"

type CountUpProps = {
  value: number
  trend?: boolean
}

export function CountUp({ value, trend = true }: CountUpProps) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(value)
  const [way, setWay] = useState<"up" | "down">()
  const [lit, setLit] = useState(false)
  const from = useRef(value * STARTS_AT)
  const previous = useRef(value)

  useEffect(() => {
    const change = value - previous.current
    previous.current = value
    if (Math.abs(change) < MIN_MOVE) return

    setWay(change > 0 ? "up" : "down")
    setLit(true)
    const timer = setTimeout(() => setLit(false), LIT_MS)
    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    if (reduced) return

    const start = performance.now()
    const origin = from.current
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      from.current = origin + (value - origin) * (1 - (1 - progress) ** 3)
      setShown(from.current)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])

  const written = formatAmount(reduced ? value : shown)
  const sign = /^[+−-]/.test(written) ? written.slice(0, 1) : ""
  const digits = sign ? written.slice(1) : written
  const point = digits.lastIndexOf(".")
  const whole = point < 0 ? digits : digits.slice(0, point)
  const cents = point < 0 ? "" : digits.slice(point)
  const Arrow = way === "up" ? PiCaretUpFill : PiCaretDownFill

  return (
    <span className="inline-flex items-center gap-[0.3em] tabular-nums">
      <span
        className={cn(
          "transition-colors duration-700",
          lit && way === "up" && "text-emerald-600 dark:text-emerald-400",
          lit && way === "down" && "text-red-600 dark:text-red-400"
        )}
      >
        {sign}
        {whole}
        <span className="text-[0.55em] opacity-60">{cents}</span>
      </span>
      {trend && way && (
        <Arrow
          aria-label={way === "up" ? "Going up" : "Going down"}
          className={cn("size-[0.4em] flex-none", way === "up" ? "text-emerald-500" : "text-red-500")}
        />
      )}
    </span>
  )
}
