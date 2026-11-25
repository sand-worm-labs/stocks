import type { PricePoint } from "@/lib/markets/history"
import { fundValues } from "@/lib/portfolios/history"
import { stretch, type ValuePoint } from "@/lib/portfolios/performance"

import type { Benchmark, BenchmarkGroup } from "@/types/benchmarks"

export type BenchmarkLine = {
  id: string
  name: string
  fund: string
  group: BenchmarkGroup
  change: number
  values: number[]
}

export function benchmarkLines(
  benchmarks: Benchmark[],
  points: ValuePoint[],
  funds?: Record<string, PricePoint[]>
): BenchmarkLine[] {
  if (funds) {
    return benchmarks.flatMap(({ id, name, fund, group }) => {
      const values = fundValues(points, funds[id] ?? [])
      const first = values?.[0]
      const last = values?.at(-1)
      return values && first && last !== undefined ? [{ id, name, fund, group, change: last / first - 1, values }] : []
    })
  }

  const base = points[0]?.value ?? 0

  return benchmarks.map(({ id, name, fund, group, weekChange, series }) => {
    const moved = stretch(series, base, base * (1 + weekChange))
    const values = points.map(
      (_, i) => moved[Math.round((i / Math.max(points.length - 1, 1)) * (moved.length - 1))] ?? base
    )

    return { id, name, fund, group, change: weekChange, values }
  })
}
