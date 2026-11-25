"use client"

import { useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"
import { PiDotFill } from "react-icons/pi"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { A_YEAR } from "@/constants/components/prompt-box/trading-mode-select"
import { TRADING_MODE_COOKIE, TRADING_MODE_OPTIONS } from "@/constants/portfolio"

type Mode = (typeof TRADING_MODE_OPTIONS)[number]["value"]

// The choice lives in a cookie, which the server reads too. Reading it is reading the browser, so it is read as an outside source, and
// a change is announced to everything that is showing it.
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener))
const readMode = (): Mode => {
  const saved = document.cookie.split("; ").find((part) => part.startsWith(`${TRADING_MODE_COOKIE}=`))
  return saved?.endsWith("=live") ? "live" : "paper"
}

export function TradingModeSelect() {
  const router = useRouter()
  const mode = useSyncExternalStore(subscribe, readMode, (): Mode => "paper")

  const change = (value: string) => {
    const next: Mode = value === "live" ? "live" : "paper"
    document.cookie = `${TRADING_MODE_COOKIE}=${next}; path=/; max-age=${A_YEAR}; samesite=lax`
    listeners.forEach((listener) => listener())
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
