import { benchmarksMockData } from "@/_mockdata/benchmarks"

import type { Benchmark } from "./types"

export async function getBenchmarks(): Promise<Benchmark[]> {
  return benchmarksMockData
}
