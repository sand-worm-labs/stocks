"use client"

import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

import { ChartLoader } from "@/components/Charts/ChartLoader"

import { LINE } from "@/constants/components/token-line-chart/token-line-chart"
import { cn } from "@/lib/utils"

type TokenLineChartProps = {
  // Oldest first, evenly spaced, the last of them now
  series: number[]
  stepSeconds: number
  tone: "positive" | "negative"
  label: string
  className?: string
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function TokenLineChart({ series, stepSeconds, tone, label, className }: TokenLineChartProps) {
  const container = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!container.current) return

    const chart = createChart(container.current, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: cssVar("--ink-400"),
        fontFamily: "inherit",
        attributionLogo: true,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: `hsl(${cssVar("--border-secondary")})` } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    })

    const now = Math.floor(Date.now() / 1000)
    const line = chart.addSeries(LineSeries, { color: LINE[tone], lineWidth: 2, priceLineVisible: false })
    line.setData(
      series.map((value, i) => ({ time: (now - (series.length - 1 - i) * stepSeconds) as UTCTimestamp, value }))
    )
    chart.timeScale().fitContent()
    setDrawn(true)

    return () => chart.remove()
  }, [series, stepSeconds, tone, resolvedTheme])

  return (
    <div className={cn("relative h-72 w-full", className)}>
      <div ref={container} role="img" aria-label={label} className="size-full" />
      <ChartLoader visible={!drawn} />
    </div>
  )
}
