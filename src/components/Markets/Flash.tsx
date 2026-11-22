"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const FLASH_MS = 1200

// Lights up green when its number goes up and red when it goes down, then settles
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
