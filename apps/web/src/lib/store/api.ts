import { callStocksApi, callStocksApiRaw } from "@/lib/api/stocks-api"
import type { StrategyRecord, StrategyStore } from "@/types/store"

import { completeRecord } from "./complete"
import { StoreConflict } from "./conflict"

// Strategies kept by the Stocks API, in its database
export class ApiStore implements StrategyStore {
  async list(ownerId: string) {
    const response = await callStocksApi(`/internal/strategies?ownerId=${encodeURIComponent(ownerId)}`)
    const records = (await response.json()) as StrategyRecord[]
    return records.map(completeRecord)
  }

  async get(id: string) {
    const response = await callStocksApi(`/internal/strategies/${encodeURIComponent(id)}`)
    if (response.status === 404) return undefined
    const record = (await response.json()) as StrategyRecord
    return completeRecord(record)
  }

  async save(record: StrategyRecord) {
    const path = `/internal/strategies/${encodeURIComponent(record.id)}`
    const response = await callStocksApiRaw(path, { method: "PUT", body: JSON.stringify(record) })
    if (response.status === 409) throw new StoreConflict()
    if (!response.ok) throw new Error(`The Stocks API answered ${response.status} for ${path}`)

    const { revision } = (await response.json()) as { revision: number }
    return revision
  }
}
