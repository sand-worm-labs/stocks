// The kinds of fund to compare with, in the order the list shows them
export const BENCHMARK_GROUPS = ["US stocks", "Sectors", "International", "Bonds", "Commodities", "Crypto"] as const
export type BenchmarkGroup = (typeof BENCHMARK_GROUPS)[number]

// An index fund or ETF to hold a portfolio up against. `weekChange` is a fraction: 0.004 is +0.4%.
export type Benchmark = {
  id: string
  name: string
  fund: string
  group: BenchmarkGroup
  weekChange: number
  series: number[]
}
