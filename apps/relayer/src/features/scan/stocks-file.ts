import { readFile, writeFile } from "node:fs/promises"
import { z } from "zod"
import { addressSchema } from "../../common/hex.schema.js"
import type { MeasuredPool } from "./measure-pools.js"

// The part of a stock the scan needs. The rest of what the file says about it is kept as it is.
const stockSchema = z
  .object({
    symbol: z.string(),
    address: addressSchema,
    firstMintDate: z.string().nullable(),
    // The pool the Stocks API found through DexScreener, if it found one
    apiPool: z.string().nullable(),
  })
  .passthrough()

export type StockRecord = z.infer<typeof stockSchema>

// What a scan looked at: the block it read the pools at, the block it started reading creations from, and whether that reaches back to the stock's first
// mint. When it does not, a stock with no pool may only have one the scan could not see.
export type ScanReach = { block: bigint; fromBlock: bigint; reachesStart: boolean }

export type OnchainScan = {
  block: number
  fromBlock: number
  reachesStart: boolean
  // Deepest first
  pools: MeasuredPool[]
  deepestPool: MeasuredPool | null
}

export async function readStocksFile(path: string): Promise<StockRecord[]> {
  const text = await readFile(path, "utf8")
  return z.array(stockSchema).parse(JSON.parse(text))
}

export async function writeStocksFile(path: string, stocks: StockRecord[]): Promise<void> {
  await writeFile(path, JSON.stringify(stocks, null, 2) + "\n")
}

// A stock with what the scan found on the chain, which may be nothing: a scan that found no pool says so, so it is not mistaken for one that never ran
export function withScan(stock: StockRecord, reach: ScanReach, pools: MeasuredPool[]): StockRecord {
  const onchain: OnchainScan = { block: Number(reach.block), fromBlock: Number(reach.fromBlock), reachesStart: reach.reachesStart, pools, deepestPool: pools[0] ?? null }
  return { ...stock, onchain }
}
