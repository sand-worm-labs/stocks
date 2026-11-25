import { benchmarksMockData } from "@/_mockdata/benchmarks"

import type { Benchmark } from "@/types/benchmarks"

export async function getBenchmarks(): Promise<Benchmark[]> {
  return benchmarksMockData
}
