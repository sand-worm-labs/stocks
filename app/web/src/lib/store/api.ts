import { callStocksApi } from "@/lib/api/stocks-api"
import type { StrategyRecord, StrategyStore } from "@/types/store"

// Strategies kept by the Stocks API, in its database
export class ApiStore implements StrategyStore {
  async list(ownerId: string) {
    const response = await callStocksApi(`/strategies?ownerId=${encodeURIComponent(ownerId)}`)
    return (await response.json()) as StrategyRecord[]
  }

  async get(id: string) {
    const response = await callStocksApi(`/strategies/${encodeURIComponent(id)}`)
    if (response.status === 404) return undefined
    return (await response.json()) as StrategyRecord
  }

  async save(record: StrategyRecord) {
    await callStocksApi(`/strategies/${encodeURIComponent(record.id)}`, { method: "PUT", body: JSON.stringify(record) })
  }
}
