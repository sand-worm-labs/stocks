"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

import { FLASH_MS } from "@/constants/components/markets/flash"
import { cn } from "@/lib/utils"

export function Flash({ value, children }: { value?: number; children: ReactNode }) {
  const previous = useRef(value)
  const [direction, setDirection] = useState<"up" | "down">()

  useEffect(() => {
    if (value === undefined || previous.current === undefined || value === previous.current) {
      previous.current = value
      return
    }

    setDirection(value > previous.current ? "up" : "down")
    previous.current = value
    const timer = setTimeout(() => setDirection(undefined), FLASH_MS)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <span
      className={cn(
        "-mx-1.5 rounded-md px-1.5 py-0.5",
        direction === "up" && "animate-flash-up",
        direction === "down" && "animate-flash-down"
      )}
    >
      {children}
    </span>
  )
}
