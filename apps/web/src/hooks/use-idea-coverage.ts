"use client"

import { useEffect, useState } from "react"

import { loadCoverage } from "@/lib/strategies/client"
import type { IdeaCoverage } from "@/types/coverage"

// What a strategy's idea named that isn't on Base, asked for once the page is open. Until it is in, or if it can't be had, there is nothing to
// show: the page never waits on it, and never says something went wrong over a note that is only a help.
export function useIdeaCoverage(strategyId: string, isReal: boolean) {
  const [coverage, setCoverage] = useState<IdeaCoverage>()

  useEffect(() => {
    if (!isReal) return
    let isCurrent = true
    loadCoverage(strategyId)
      .then((found) => isCurrent && setCoverage(found))
      .catch(() => undefined)
    return () => {
      isCurrent = false
    }
  }, [strategyId, isReal])

  return coverage
}
