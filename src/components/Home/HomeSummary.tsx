import { Fragment, type ReactNode } from "react"

import { TradingChart } from "@/components/Charts/TradingChart"
import { ProfitLine } from "@/components/Money/ProfitLine"
import { Card } from "@/components/ui/card"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { SUMMARY_CARD_SURFACE } from "@/constants/cards"
import { STATS } from "@/constants/components/home/home-summary"
import { benchmarkLines } from "@/lib/benchmarks/compare"
import { formatDay, formatTime } from "@/lib/dates"
import type { AllocationSlice } from "@/lib/home/allocation"
import type { PricePoint } from "@/lib/markets/history"
import type { ChartEvent } from "@/lib/portfolios/chart"
import type { ValuePoint } from "@/lib/portfolios/performance"
import type { Benchmark } from "@/types/benchmarks"
import type { Kpi } from "@/types/home"

import { AllocationBar } from "./AllocationBar"
import { CountUp } from "./CountUp"

type HomeSummaryProps = {
  kpis: Kpi[]
  points: ValuePoint[]
  slices: AllocationSlice[]
  benchmarks: Benchmark[]
  funds?: Record<string, PricePoint[]>
  events?: ChartEvent[]
  now: string
  addFunds: ReactNode
}

export function HomeSummary({ kpis, points, slices, benchmarks, funds, events, now, addFunds }: HomeSummaryProps) {
  const total = kpis.find(({ id }) => id === "value")
  const profit = kpis.find(({ id }) => id === "profit")
  const put = kpis.find(({ id }) => id === "deposited")

  return (
    <Card className={SUMMARY_CARD_SURFACE}>
      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-ink-400 text-sm">
              {total?.label} <span aria-hidden="true">·</span> {total?.caption}
            </span>
            <span className="flex items-center gap-3 text-[52px] leading-[56px] font-normal tracking-tight">
              <UsdcMark className="size-9 flex-none" />
              <CountUp value={total?.amount ?? 0} />
            </span>
            <ProfitLine profit={profit?.amount ?? 0} put={put?.amount ?? 0} className="mt-1" />
            <dl className="mt-4 flex flex-wrap gap-2.5">
              {STATS.map(({ id, icon: Icon }, i) => {
                const stat = kpis.find((kpi) => kpi.id === id)
                if (!stat) return null

                return (
                  <div
                    key={id}
                    style={{ "--index": i + 1 } as React.CSSProperties}
                    className="animate-fade-up border-border-secondary bg-block-surface/70 dark:border-border-tertiary flex items-center gap-3 rounded-2xl border py-2.5 pr-4 pl-2.5 backdrop-blur-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-primary-tint-75 text-primary dark:bg-primary/15 flex size-9 flex-none items-center justify-center rounded-xl"
                    >
                      <Icon size={18} />
                    </span>
                    <div className="flex flex-col">
                      <dt className="text-ink-400 text-xs">{stat.label}</dt>
                      <dd className="flex items-center gap-1.5 text-lg leading-6">
                        <UsdcMark className="size-4" />
                        <CountUp value={stat.amount ?? 0} />
                      </dd>
                    </div>
                  </div>
                )
              })}
            </dl>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Fragment key="add-funds">{addFunds}</Fragment>
            <span className="text-ink-400 text-xs">
              Last update {formatTime(now)}, {formatDay(now)}
            </span>
          </div>
        </div>
        <AllocationBar slices={slices} />
        <TradingChart
          points={points}
          lines={benchmarkLines(benchmarks, points, funds)}
          events={events}
          name="My strategies"
          label="The value of everything you hold over the last week, against index funds and ETFs"
        />
      </div>
    </Card>
  )
}
