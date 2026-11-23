"use client"

import type { ReactNode } from "react"

import { useLivePortfolios } from "@/components/Portfolios/useLivePortfolios"
import type { Benchmark } from "@/lib/benchmarks/types"
import { buildAllocation } from "@/lib/home/allocation"
import { buildKpis } from "@/lib/home/kpis"
import { totalValueOverWeek } from "@/lib/portfolios/performance"
import type { Portfolio } from "@/lib/portfolios/types"

import { HomeSummary } from "./HomeSummary"

type HomeSummaryLiveProps = {
  portfolios: Portfolio[]
  addresses: Record<string, string>
  benchmarks: Benchmark[]
  now: string
  addFunds: ReactNode
}

// The summary of everything held, worked out again at each price the market makes: the total, the gain, the split by
// model and the line all move with it
export function HomeSummaryLive({ portfolios, addresses, benchmarks, now, addFunds }: HomeSummaryLiveProps) {
  const live = useLivePortfolios(portfolios, addresses)

  return (
    <HomeSummary
      kpis={buildKpis(live)}
      points={totalValueOverWeek(live, now)}
      slices={buildAllocation(live)}
      benchmarks={benchmarks}
      now={now}
      addFunds={addFunds}
    />
  )
}
