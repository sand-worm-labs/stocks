"use client"

import { type ReactNode, useEffect, useState } from "react"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import type { Benchmark } from "@/lib/benchmarks/types"
import { buildAllocation } from "@/lib/home/allocation"
import { buildKpis } from "@/lib/home/kpis"
import type { ChartData } from "@/lib/portfolios/chart"
import { totalValueOverWeek } from "@/lib/portfolios/performance"
import type { Portfolio } from "@/lib/portfolios/types"

import { HomeSummary } from "./HomeSummary"

type HomeSummaryLiveProps = {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  benchmarks: Benchmark[]
  // What the server worked the value over time out from, for the strategies made here
  chart?: ChartData
  now: string
  addFunds: ReactNode
}

// How often the clock moves on while the page is open, so the end of the chart is the time it is and not the time the page was loaded
const CLOCK_MS = 30_000

// The summary of everything held, worked out again at each price the market makes: the total, the gain, the split by
// model and the line all move with it, and so does the time the line runs to
export function HomeSummaryLive({ portfolios, addresses, benchmarks, chart, now, addFunds }: HomeSummaryLiveProps) {
  const live = useLivePortfolios(portfolios, addresses)
  const [clock, setClock] = useState(now)

  useEffect(() => {
    if (!chart) return
    const timer = setInterval(() => setClock(new Date().toISOString()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [chart])

  return (
    <HomeSummary
      kpis={buildKpis(live)}
      points={totalValueOverWeek(live, clock, chart?.histories)}
      slices={buildAllocation(live)}
      benchmarks={benchmarks}
      funds={chart?.funds}
      events={chart?.events}
      now={clock}
      addFunds={addFunds}
    />
  )
}
