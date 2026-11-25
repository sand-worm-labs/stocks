import { tmpdir } from "node:os"
import { join } from "node:path"

import { connect } from "@/db/client"

import type { StrategyStore } from "@/types/store"
import { FileStore } from "./file"
import { PostgresStore } from "./postgres"

declare global {
  var strategyFileStore: FileStore | undefined
}

// Where strategies are kept: Postgres when `DATABASE_URL` is set (Neon, or any Postgres that `pnpm db:migrate` has been run on), otherwise
// a file, so the app works from the first run without a database. On Vercel the file is in a temporary folder that does not survive, which
// is fine for a look and not for real use: set `DATABASE_URL` there. Everything else asks for the store only through here.
//
// Only the connection (or the file's write queue) is kept between reloads in development, never the store made from it: a store that was
// kept would go on running the code it was made with, and a change to that code would not show until the server was restarted.
export function getStore(): StrategyStore {
  const url = process.env.DATABASE_URL
  if (url) return new PostgresStore(connect(url))

  const folder = process.env.VERCEL ? tmpdir() : join(process.cwd(), ".data")
  return (globalThis.strategyFileStore ??= new FileStore(process.env.STORE_FILE ?? join(folder, "strategies.json")))
}
