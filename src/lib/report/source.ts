import { ordersMockData, reportMockData } from "@/_mockdata/reports"

import type { Order, Report } from "./types"

export async function getReport(version: Report["version"]): Promise<Report> {
  return reportMockData[version]
}

export async function getOrders(): Promise<Order[]> {
  return ordersMockData
}
