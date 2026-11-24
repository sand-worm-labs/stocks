import { ordersMockData, reportMockData } from "@/_mockdata/reports"
import { getOwnStrategy } from "@/lib/strategies/source"

import type { Order, Report } from "./types"

// The report to read: the latest research on a strategy made here, or for any other the example one. `version` picks which example.
export async function getReport(version: Report["version"], strategyId?: string): Promise<Report> {
  const own = strategyId ? await getOwnStrategy(strategyId) : undefined
  return own?.report ?? reportMockData[version]
}

// What buying it would place, from the same research
export async function getOrders(version: Report["version"], strategyId?: string): Promise<Order[]> {
  const own = strategyId ? await getOwnStrategy(strategyId) : undefined
  return [...(own?.orders ?? ordersMockData[version])]
}
