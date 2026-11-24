"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PiDotFill } from "react-icons/pi"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRADING_MODE_COOKIE, TRADING_MODE_OPTIONS } from "@/constants/portfolio"

type Mode = (typeof TRADING_MODE_OPTIONS)[number]["value"]

const A_YEAR = 60 * 60 * 24 * 365

// Switches between paper trading and the wallet, in the place the chat puts its model picker. The choice is kept, and the pages are
// asked for again, because what the trade dialog does depends on it.
export function TradingModeSelect() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("paper")

  useEffect(() => {
    const saved = document.cookie.split("; ").find((part) => part.startsWith(`${TRADING_MODE_COOKIE}=`))
    setMode(saved?.endsWith("=live") ? "live" : "paper")
  }, [])

  const change = (value: string) => {
    const next: Mode = value === "live" ? "live" : "paper"
    document.cookie = `${TRADING_MODE_COOKIE}=${next}; path=/; max-age=${A_YEAR}; samesite=lax`
    setMode(next)
    router.refresh()
  }

  return (
    <Select value={mode} onValueChange={change}>
      <SelectTrigger
        aria-label="Trading mode"
        className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg hover:border-hover-border dark:hover:bg-sidebar-hover min-h-8 max-w-[11rem] min-w-0 gap-1.5 rounded-full border-transparent bg-transparent px-3 text-xs transition-[background-color,border-color,color] duration-200 ease-out sm:max-w-none dark:bg-transparent"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TRADING_MODE_OPTIONS.map(({ value, title, detail }) => (
          <SelectItem key={value} value={value}>
            <span className="flex items-center gap-0.5">
              {title}
              <PiDotFill size={18} aria-hidden="true" className="text-ink-300 -mx-0.5 flex-none" />
              <span className="text-ink-400">{detail}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
