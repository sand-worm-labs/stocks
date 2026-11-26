import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type { StrategyRecord, StrategyStore } from "@/types/store"

import { completeRecord } from "./complete"
import { StoreConflict } from "./conflict"

type Data = Record<string, StrategyRecord>

// Strategies in one JSON file: what the app uses until a database is set up, and what the tests use. Fine for one process; it is not
// meant for several servers, which is what `DATABASE_URL` is for. Writes go one after another and land whole or not at all.
export class FileStore implements StrategyStore {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly path: string) {}

  // A strategy kept before revisions existed is at revision 0, which is what whoever reads it sends back
  private async read(): Promise<Data> {
    try {
      const data = JSON.parse(await readFile(this.path, "utf8")) as Data
      return Object.fromEntries(Object.entries(data).map(([id, record]) => [id, { ...record, revision: record.revision ?? 0 }]))
    } catch {
      return {}
    }
  }

  // Runs `task` after everything asked before it, so two requests never read the same file and overwrite each other
  private serial<T>(task: () => Promise<T>) {
    const next = this.queue.then(task, task)
    this.queue = next.catch(() => undefined)
    return next
  }

  list(ownerId: string) {
    return this.serial(async () =>
      Object.values(await this.read())
        .filter((record) => record.ownerId === ownerId)
        .map(completeRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  }

  get(id: string) {
    return this.serial(async () => {
      const record = (await this.read())[id]
      return record && completeRecord(record)
    })
  }

  save(record: StrategyRecord) {
    return this.serial(async () => {
      const data = await this.read()
      const current = data[record.id]
      if (current && record.revision !== current.revision) throw new StoreConflict()

      const revision = (current?.revision ?? 0) + 1
      data[record.id] = { ...record, revision }
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(`${this.path}.tmp`, JSON.stringify(data, null, 2))
      await rename(`${this.path}.tmp`, this.path)
      return revision
    })
  }
}
