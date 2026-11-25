import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type { StrategyRecord, StrategyStore } from "@/types/store"

type Data = Record<string, StrategyRecord>

// Strategies in one JSON file: what the app uses until a database is set up, and what the tests use. Fine for one process; it is not
// meant for several servers, which is what `DATABASE_URL` is for. Writes go one after another and land whole or not at all.
export class FileStore implements StrategyStore {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly path: string) {}

  private async read(): Promise<Data> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as Data
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
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  }

  get(id: string) {
    return this.serial(async () => (await this.read())[id])
  }

  save(record: StrategyRecord) {
    return this.serial(async () => {
      const data = await this.read()
      data[record.id] = record
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(`${this.path}.tmp`, JSON.stringify(data, null, 2))
      await rename(`${this.path}.tmp`, this.path)
    })
  }
}
