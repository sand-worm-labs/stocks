"use client"

import { type ReactNode, useEffect, useState } from "react"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import { CLOCK_MS } from "@/constants/components/home/home-summary-live"
import { buildAllocation } from "@/lib/home/allocation"
import { buildKpis } from "@/lib/home/kpis"
import type { ChartData } from "@/lib/portfolios/chart"
import { totalValueOverWeek } from "@/lib/portfolios/performance"
import type { Benchmark } from "@/types/benchmarks"
import type { Portfolio } from "@/types/portfolios"

import { HomeSummary } from "./HomeSummary"

type HomeSummaryLiveProps = {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  benchmarks: Benchmark[]
  chart?: ChartData
  now: string
  addFunds: ReactNode
}

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
