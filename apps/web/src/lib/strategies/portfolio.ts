import { DRAFT_STAGE } from "@/constants/portfolio"
import type { Portfolio } from "@/types/portfolios"
import type { StrategyRecord } from "@/types/store"

// A stored strategy as the pages draw one. Its value over time is worked out in the browser from live prices, so the series here is
// just a start and a now.
export function toPortfolio(record: StrategyRecord): Portfolio {
  const value = record.holdings.reduce((sum, { value }) => sum + value, 0) + record.cash
  return {
    id: record.id,
    own: true,
    name: record.name,
    brief: record.brief,
    status: record.status,
    closedAt: record.closedAt,
    stage: record.status === "draft" ? record.stage : undefined,
    createdAt: record.createdAt,
    holdings: record.holdings,
    cash: record.cash,
    startedAt: record.startedAt,
    weekChange: record.status === "live" ? 0 : undefined,
    worstDip: record.status === "live" ? 0 : undefined,
    series: record.status === "live" ? [value, value] : [],
    note: record.status === "draft" ? DRAFT_STAGE[record.stage].detail : undefined,
  }
}
