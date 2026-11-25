import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

export type Database = PgDatabase<PgQueryResultHKT>

declare global {
  var databaseConnection: ReturnType<typeof postgres> | undefined
}

// Connects to `DATABASE_URL` (Neon, or any Postgres). Only the connection is kept between reloads in development, never what is made from
// it, so a change to the code that uses it is not hidden behind a server that still runs the old one.
export function connect(url: string): Database {
  globalThis.databaseConnection ??= postgres(url, { max: 5, idle_timeout: 20 })
  return drizzle(globalThis.databaseConnection)
}
