"use client"

import { useTheme } from "next-themes"

import { POOL_CHART_INTERVAL, POOL_CHART_URL } from "@/constants/markets"

// The token's own chart: the candles of the pool it trades in on Base, a minute to a candle, drawn by the same
// charting library TradingView's are and moving with every swap
export function PoolChart({ pair, label }: { pair: string; label: string }) {
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "dark" ? "dark" : "light"

  const params = new URLSearchParams({
    embed: "1",
    theme,
    chartTheme: theme,
    chartStyle: "1",
    chartType: "usd",
    interval: POOL_CHART_INTERVAL,
    loadChartSettings: "0",
    chartLeftToolbar: "0",
    chartDefaultOnMobile: "1",
    trades: "0",
    info: "0",
  })

  return (
    <iframe
      key={theme}
      title={label}
      src={`${POOL_CHART_URL}/${pair}?${params}`}
      className="block h-[420px] w-full border-0 md:h-[560px]"
      allow="clipboard-write"
    />
  )
}
