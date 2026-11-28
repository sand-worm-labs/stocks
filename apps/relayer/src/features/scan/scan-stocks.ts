import type { PublicClient } from "viem"
import { log } from "../../common/log.js"
import type { ScanConfig } from "../../core/config/scan.config.js"
import { findBlockAt, type FoundBlock } from "../../infrastructure/base-mainnet/find-block.js"
import { readPoolCreations } from "../../infrastructure/base-mainnet/pool-creations.js"
import { findCandidates, lowercase } from "./find-candidates.js"
import { measureCandidates } from "./measure-pools.js"
import { readStocksFile, withScan, writeStocksFile, type StockRecord } from "./stocks-file.js"

// Finds each stock's pools on the chain itself, with no index in between, and writes what it found into the stocks file as `onchain`.
export async function scanStocks(config: ScanConfig, client: PublicClient): Promise<void> {
  const stocks = await readStocksFile(config.stocksFile)
  const scanned = stocks.filter((stock) => config.isScanningAll || stock.apiPool === null)
  log(`scanning ${scanned.length} of ${stocks.length} stocks`)
  if (scanned.length === 0) return

  const head = await client.getBlockNumber()
  const { block: fromBlock, reachesMoment } = await startOf(config, client, scanned, head)
  log(`reading pool creations from block ${fromBlock} to ${head}`)
  if (!reachesMoment) log("WARNING: the RPC does not serve blocks as old as the first stock, so older pools are missed; use an archive node as MAINNET_RPC_URL")
  const creations = await readPoolCreations(client, fromBlock, head, (done, total) => {
    if (done % 10 === 0 || done === total) log(`  ${done}/${total} block ranges`)
  })

  const addresses = new Set(scanned.map(({ address }) => lowercase(address)))
  const candidates = findCandidates(creations, addresses)
  log(`${creations.length} pools made, ${candidates.length} of them hold a stock`)

  const { block, pools } = await measureCandidates(client, candidates)
  const results = stocks.map((stock) => (scanned.includes(stock) ? withScan(stock, { block, fromBlock, reachesStart: reachesMoment }, pools.get(lowercase(stock.address)) ?? []) : stock))
  await writeStocksFile(config.stocksFile, results)
  summarize(results, scanned)
}

// Where to start reading: no pool can be older than the first stock token. A start given in the config is taken as it is.
async function startOf(config: ScanConfig, client: PublicClient, scanned: StockRecord[], head: bigint): Promise<FoundBlock> {
  if (config.fromBlock !== undefined) return { block: config.fromBlock, reachesMoment: true }
  return findBlockAt(client, firstMintOf(scanned), head)
}

function firstMintOf(stocks: StockRecord[]): Date {
  const dates = stocks.flatMap(({ firstMintDate }) => (firstMintDate ? [new Date(firstMintDate)] : []))
  const first = dates.sort((a, b) => a.getTime() - b.getTime())[0]
  if (!first) throw new Error("no stock says when it was first minted: set SCAN_FROM_BLOCK")
  return first
}

function summarize(results: StockRecord[], scanned: StockRecord[]): void {
  const scannedSymbols = new Set(scanned.map(({ symbol }) => symbol))
  const found = results.filter(({ symbol, onchain }) => scannedSymbols.has(symbol) && hasPool(onchain))
  log(`found a pool on the chain for ${found.length} of ${scanned.length} stocks`)
}

function hasPool(onchain: unknown): boolean {
  return typeof onchain === "object" && onchain !== null && "deepestPool" in onchain && onchain.deepestPool !== null
}
