import { stretch, type ValuePoint } from "@/lib/portfolios/performance"

import type { Benchmark, BenchmarkGroup } from "./types"

// A benchmark as it would have moved the money put in: from where the portfolio started, to its own change, on the
// same points as the portfolio so the two can be drawn together
export type BenchmarkLine = {
  id: string
  name: string
  fund: string
  group: BenchmarkGroup
  change: number
  values: number[]
}

export function benchmarkLines(benchmarks: Benchmark[], points: ValuePoint[]): BenchmarkLine[] {
  const base = points[0]?.value ?? 0

  return benchmarks.map(({ id, name, fund, group, weekChange, series }) => {
    const moved = stretch(series, base, base * (1 + weekChange))
    const values = points.map(
      (_, i) => moved[Math.round((i / Math.max(points.length - 1, 1)) * (moved.length - 1))] ?? base
    )

    return { id, name, fund, group, change: weekChange, values }
  })
}
