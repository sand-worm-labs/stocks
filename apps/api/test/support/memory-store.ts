import { StoreConflict } from "@/features/strategies/lifecycle/store-conflict"
import type { StrategyRecord, StrategyStore } from "@/features/strategies/types/strategy-record"

// Strategies kept in memory, with the same rules about revisions as the database, for testing what uses a store
export class MemoryStore implements StrategyStore {
  private readonly records = new Map<string, StrategyRecord>()

  // Takes the file path the file store took, so a test written for it reads the same
  constructor(_path?: string) {}

  async list(ownerId: string) {
    return [...this.records.values()].filter((record) => record.ownerId === ownerId && !record.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async listRemoved(ownerId: string) {
    return [...this.records.values()].filter((record) => record.ownerId === ownerId && record.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""))
  }

  async removedBefore(cutoff: Date) {
    return [...this.records.values()].filter((record) => record.deletedAt && Date.parse(record.deletedAt) < cutoff.getTime()).map(({ id, ownerId }) => ({ id, ownerId }))
  }

  async purge(id: string) {
    this.records.delete(id)
  }

  async get(id: string) {
    const record = this.records.get(id)
    return record && structuredClone(record)
  }

  async save(record: StrategyRecord) {
    const current = this.records.get(record.id)
    if (current && record.revision !== current.revision) throw new StoreConflict()

    const revision = (current?.revision ?? 0) + 1
    this.records.set(record.id, structuredClone({ ...record, revision }))
    return revision
  }
}
