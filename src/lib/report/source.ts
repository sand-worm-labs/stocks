import { ordersMockData, reportMockData } from "@/_mockdata/reports"
import { getOwnStrategy } from "@/lib/strategies/source"

import type { Order, Report } from "@/types/report"

export async function getReport(version: Report["version"], strategyId?: string): Promise<Report> {
  const own = strategyId ? await getOwnStrategy(strategyId) : undefined
  return own?.report ?? reportMockData[version]
}

export async function getOrders(version: Report["version"], strategyId?: string): Promise<Order[]> {
  const own = strategyId ? await getOwnStrategy(strategyId) : undefined
  return [...(own?.orders ?? ordersMockData[version])]
}
