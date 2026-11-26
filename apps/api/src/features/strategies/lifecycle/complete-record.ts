import { completeResult } from "@/features/research/research-result"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

// A kept strategy as the rest of the app can rely on it. What is kept is JSON written by earlier versions of the app, so a field added since
// is missing from it; this is the one place that fills such a field in, so no page has to guess whether it is there.
export function completeRecord(record: StrategyRecord): StrategyRecord {
  const { research } = record
  if (!research?.result) return record
  return { ...record, research: { ...research, result: completeResult(research.result) } }
}
