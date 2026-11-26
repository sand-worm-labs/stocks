"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

import { WIDGET_SCRIPT } from "@/constants/components/trading-view-chart/trading-view-chart"
import { cn } from "@/lib/utils"

type TradingViewChartProps = {
  symbol: string
  label: string
  className?: string
}

// TradingView's own chart, with its real market data. It reads the theme once it is mounted, so it is rebuilt on a change.
export function TradingViewChart({ symbol, label, className }: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const host = container.current
    if (!host) return

    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget"
    widget.style.height = "100%"
    widget.style.width = "100%"

    const script = document.createElement("script")
    script.src = WIDGET_SCRIPT
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: resolvedTheme === "dark" ? "dark" : "light",
      style: "3",
      locale: "en",
      allow_symbol_change: false,
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_volume: true,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      save_image: false,
      backgroundColor: resolvedTheme === "dark" ? "#1A1A1A" : "#FFFFFF",
      support_host: "https://www.tradingview.com",
    })

    host.append(widget, script)

    return () => host.replaceChildren()
  }, [symbol, resolvedTheme])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div role="img" aria-label={label} className="h-[420px] w-full overflow-hidden md:h-[560px]">
        <div ref={container} className="tradingview-widget-container" />
      </div>
      <a
        href={`https://www.tradingview.com/symbols/${symbol}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-400 hover:text-ink-100 self-end text-xs transition-colors"
      >
        Chart by TradingView ↗
      </a>
    </div>
  )
}
