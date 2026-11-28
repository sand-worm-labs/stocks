import { z } from "zod"
import { flag } from "./env.js"

const configSchema = z.object({
  // Needs eth_getLogs over 50,000 blocks; https://base-rpc.publicnode.com does
  MAINNET_RPC_URL: z.string().url(),
  STOCKS_FILE: z.string().default("deployments/base-mainnet/stocks.json"),
  // true scans every stock; by default only the ones DexScreener found no pool for
  SCAN_ALL: flag("false"),
  // Where to start reading pool creations, when the stocks do not say when they were first minted
  SCAN_FROM_BLOCK: z.coerce.bigint().optional(),
})

export type ScanConfig = {
  mainnetRpcUrl: string
  stocksFile: string
  isScanningAll: boolean
  fromBlock: bigint | undefined
}

export function readScanConfig(env: NodeJS.ProcessEnv): ScanConfig {
  const parsed = configSchema.parse(env)
  return { mainnetRpcUrl: parsed.MAINNET_RPC_URL, stocksFile: parsed.STOCKS_FILE, isScanningAll: parsed.SCAN_ALL, fromBlock: parsed.SCAN_FROM_BLOCK }
}
