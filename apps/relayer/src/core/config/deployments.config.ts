import type { Address } from "viem"
import { z } from "zod"
import { addressSchema } from "../../common/hex.schema.js"
import type { StocksApi } from "../../infrastructure/stocks-api/stocks-api.js"
import { requireStocksApi, stocksApiEnvSchema, stocksApiOf, testnetContractsEnvSchema } from "./env.js"

const configSchema = testnetContractsEnvSchema.merge(stocksApiEnvSchema).extend({
  TESTNET_RPC_URL: z.string().url(),
  MIRROR_ADDRESS: addressSchema,
  MIRROR_ROUTER_ADDRESS: addressSchema,
  // The compiled contracts (forge's `out` folder), which what is on the chain is compared with
  CONTRACTS_OUT: z.string().default("../contracts/out"),
  // Where the record of what is deployed is written: a folder for the mainnet, one for the test network, and what ties them together
  DEPLOYMENTS_DIR: z.string().default("deployments"),
})

export type DeploymentsConfig = {
  testnetRpcUrl: string
  contractsOut: string
  directory: string
  // Where the mainnet stocks and their pools are found
  stocksApi: StocksApi
  // By the name of the contract in apps/contracts
  contracts: Record<"StockFaucet" | "MirrorBook" | "TestUSDC" | "MirrorPoolFactory" | "MirrorRouter", Address>
}

export function readDeploymentsConfig(env: NodeJS.ProcessEnv): DeploymentsConfig {
  const parsed = configSchema.parse(env)
  return {
    testnetRpcUrl: parsed.TESTNET_RPC_URL,
    contractsOut: parsed.CONTRACTS_OUT,
    directory: parsed.DEPLOYMENTS_DIR,
    stocksApi: requireStocksApi(stocksApiOf(parsed)),
    contracts: {
      StockFaucet: parsed.FAUCET_ADDRESS,
      MirrorBook: parsed.MIRROR_ADDRESS,
      TestUSDC: parsed.TEST_USDC_ADDRESS,
      MirrorPoolFactory: parsed.POOL_FACTORY_ADDRESS,
      MirrorRouter: parsed.MIRROR_ROUTER_ADDRESS,
    },
  }
}
