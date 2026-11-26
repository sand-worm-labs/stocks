import { tmpdir } from "node:os"
import { join } from "node:path"

import { stocksApiUrl } from "@/lib/api/stocks-api"

import type { StrategyStore } from "@/types/store"
import { ApiStore } from "./api"
import { FileStore } from "./file"

declare global {
  var strategyFileStore: FileStore | undefined
}

// Where strategies are kept: in the Stocks API's database when `STOCKS_API_URL` is set, otherwise in a file, so the app works from the first
// run without the API. On Vercel the file is in a temporary folder that does not survive, which is fine for a look and not for real use.
// Everything else asks for the store only through here.
export function getStore(): StrategyStore {
  if (stocksApiUrl()) return new ApiStore()

  const folder = process.env.VERCEL ? tmpdir() : join(process.cwd(), ".data")
  return (globalThis.strategyFileStore ??= new FileStore(process.env.STORE_FILE ?? join(folder, "strategies.json")))
}
