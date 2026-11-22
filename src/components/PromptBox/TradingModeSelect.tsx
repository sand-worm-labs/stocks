"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRADING_MODE_OPTIONS } from "@/constants/portfolio"

// Switches between paper trading and the wallet, in the place the chat puts its model picker
export function TradingModeSelect() {
  return (
    <Select defaultValue="paper">
      <SelectTrigger
        aria-label="Trading mode"
        className="text-ink-400 hover:text-ink-100 min-h-8 max-w-[11rem] min-w-0 gap-1.5 rounded-full border-transparent bg-transparent px-3 text-xs sm:max-w-none dark:bg-transparent"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TRADING_MODE_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
