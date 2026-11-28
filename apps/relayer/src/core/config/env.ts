import { z } from "zod"
import { addressSchema, bytes32Schema } from "../../common/hex.schema.js"
import type { StocksApi } from "../../infrastructure/stocks-api/stocks-api.js"

// "true" or "false" in the environment, a boolean in the code
export function flag(fallback: "true" | "false") {
  return z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true")
}

// What the relayer and the provisioning script both need to reach the two chains
export const chainEnvSchema = z.object({
  MAINNET_RPC_URL: z.string().url(),
  TESTNET_RPC_URL: z.string().url(),
  RELAYER_PRIVATE_KEY: bytes32Schema.optional(),
  DRY_RUN: flag("true"),
})

type ChainEnv = z.infer<typeof chainEnvSchema>

// A dry run only reads, so it needs no key; a live run sends transactions, so it does.
export function checkKeyForLiveRun(env: ChainEnv): void {
  const isLive = !env.DRY_RUN
  if (isLive && !env.RELAYER_PRIVATE_KEY) throw new Error("RELAYER_PRIVATE_KEY is needed when DRY_RUN is false")
}

export function runMode(isDryRun: boolean): string {
  return isDryRun ? "dry run, nothing is sent" : "live"
}

// The Stocks API, where the stocks and their pools are found
export const stocksApiEnvSchema = z.object({
  STOCKS_API_URL: z.string().url().optional(),
  STOCKS_API_KEY: z.string().min(1).optional(),
})

export function stocksApiOf(env: z.infer<typeof stocksApiEnvSchema>): StocksApi | undefined {
  if (!env.STOCKS_API_URL || !env.STOCKS_API_KEY) return undefined
  return { url: env.STOCKS_API_URL.replace(/\/$/, ""), key: env.STOCKS_API_KEY }
}

export function requireStocksApi(api: StocksApi | undefined): StocksApi {
  if (!api) throw new Error("STOCKS_API_URL and STOCKS_API_KEY are needed to find the stock pools")
  return api
}

// What `apps/contracts` deployed on the test network (script/DeployMirrorMarket.s.sol), and the key must be the account that deployed them
export const testnetContractsEnvSchema = z.object({
  FAUCET_ADDRESS: addressSchema,
  TEST_USDC_ADDRESS: addressSchema,
  POOL_FACTORY_ADDRESS: addressSchema,
})
