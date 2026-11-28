import type { Address, Hex } from "viem"
import { z } from "zod"
import type { StocksApi } from "../../infrastructure/stocks-api/stocks-api.js"
import { chainEnvSchema, checkKeyForLiveRun, requireStocksApi, stocksApiEnvSchema, stocksApiOf, testnetContractsEnvSchema } from "./env.js"

const configSchema = chainEnvSchema.merge(stocksApiEnvSchema).merge(testnetContractsEnvSchema).extend({
  SALTS_FILE: z.string().default("vanity-salts.json"),
  MARKET_FILE: z.string().default("testnet-market.json"),
})

export type ProvisionConfig = {
  mainnetRpcUrl: string
  testnetRpcUrl: string
  faucet: Address
  usdc: Address
  poolFactory: Address
  privateKey: Hex | undefined
  isDryRun: boolean
  saltsFile: string
  marketFile: string
  stocksApi: StocksApi
}

export function readProvisionConfig(env: NodeJS.ProcessEnv): ProvisionConfig {
  const parsed = configSchema.parse(env)
  checkKeyForLiveRun(parsed)

  return {
    mainnetRpcUrl: parsed.MAINNET_RPC_URL,
    testnetRpcUrl: parsed.TESTNET_RPC_URL,
    faucet: parsed.FAUCET_ADDRESS,
    usdc: parsed.TEST_USDC_ADDRESS,
    poolFactory: parsed.POOL_FACTORY_ADDRESS,
    privateKey: parsed.RELAYER_PRIVATE_KEY,
    isDryRun: parsed.DRY_RUN,
    saltsFile: parsed.SALTS_FILE,
    marketFile: parsed.MARKET_FILE,
    stocksApi: requireStocksApi(stocksApiOf(parsed)),
  }
}
