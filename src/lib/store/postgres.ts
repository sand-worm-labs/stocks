import { SCHEMA } from "./schema"
import type { StrategyRecord, StrategyStore } from "./types"

// How this store talks to Postgres: a query and its values in, rows out. The app gives it `postgres`'s; the tests give it an in-memory
// Postgres. Nothing here knows which.
export type Query = (text: string, values?: unknown[]) => Promise<Record<string, unknown>[]>

// What is not a column of its own is kept together as the record's document
type Document = Omit<
  StrategyRecord,
  "id" | "ownerId" | "name" | "brief" | "status" | "stage" | "createdAt" | "updatedAt" | "startedAt"
>

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : undefined)

// The document as the driver hands it back. Some drivers give an object; one that was stored as JSON text, or as JSON text of JSON text
// (which a driver can do to a string it is told is JSON), gives a string, however many times it was wrapped.
function readDocument(data: unknown): Document {
  let value = data
  for (let wrapped = 0; typeof value === "string" && wrapped < 3; wrapped++) value = JSON.parse(value)
  return (value ?? {}) as Document
}

const toRecord = (row: Record<string, unknown>): StrategyRecord => ({
  ...readDocument(row.data),
  id: row.id as string,
  ownerId: row.owner_id as string,
  name: row.name as string,
  brief: row.brief as string,
  status: row.status as StrategyRecord["status"],
  stage: row.stage as StrategyRecord["stage"],
  createdAt: iso(row.created_at) as string,
  updatedAt: iso(row.updated_at) as string,
  startedAt: iso(row.started_at),
})

// Whether the table has been made, for each way of asking. Kept outside the store so a store can be made afresh as often as is wanted
// (which is how a change to this code takes effect without a restart) without making the table again each time.
const schemas = new WeakMap<Query, Promise<unknown>>()

export class PostgresStore implements StrategyStore {
  constructor(private readonly query: Query) {}

  private async run(text: string, values?: unknown[]) {
    let ready = schemas.get(this.query)
    if (!ready) {
      ready = SCHEMA.reduce<Promise<unknown>>(
        (done, statement) => done.then(() => this.query(statement)),
        Promise.resolve()
      )
      schemas.set(this.query, ready)
      // A failure is not remembered: the next ask tries again
      ready.catch(() => schemas.delete(this.query))
    }
    await ready
    return this.query(text, values)
  }

  async list(ownerId: string) {
    const rows = await this.run("select * from strategies where owner_id = $1 order by created_at desc", [ownerId])
    return rows.map(toRecord)
  }

  async get(id: string) {
    const [row] = await this.run("select * from strategies where id = $1", [id])
    return row ? toRecord(row) : undefined
  }

  async save({
    id,
    ownerId,
    name,
    brief,
    status,
    stage,
    createdAt,
    updatedAt,
    startedAt,
    ...document
  }: StrategyRecord) {
    await this.run(
      `insert into strategies (id, owner_id, name, brief, status, stage, data, created_at, updated_at, started_at)
       values ($1, $2, $3, $4, $5, $6, $7::text::jsonb, $8, $9, $10)
       on conflict (id) do update set
         name = excluded.name, brief = excluded.brief, status = excluded.status, stage = excluded.stage, data = excluded.data,
         updated_at = excluded.updated_at, started_at = excluded.started_at`,
      [id, ownerId, name, brief, status, stage, JSON.stringify(document), createdAt, updatedAt, startedAt ?? null]
    )
  }
}
