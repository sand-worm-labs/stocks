import type { Address, Hex } from "viem"
import { z } from "zod"
import { addressSchema } from "../../common/hex.schema.js"
import type { StocksApi } from "../../infrastructure/stocks-api/stocks-api.js"
import { chainEnvSchema, checkKeyForLiveRun, flag, requireStocksApi, stocksApiEnvSchema, stocksApiOf, testnetContractsEnvSchema } from "./env.js"

const configSchema = chainEnvSchema.merge(stocksApiEnvSchema).merge(testnetContractsEnvSchema.partial()).extend({
  MIRROR_ADDRESS: addressSchema,
  POLL_SECONDS: z.coerce.number().int().positive().default(2),
  MIN_TICK_MOVE: z.coerce.number().int().positive().default(1),
  MIN_LIQUIDITY_MOVE_PERCENT: z.coerce.number().int().positive().default(10),
  MAX_AGE_SECONDS: z.coerce.number().int().positive().default(3600),
  BATCH_SIZE: z.coerce.number().int().positive().max(200).default(100),
  POOLS_FILE: z.string().default("pools.json"),
  DISCOVER_POOLS: flag("false"),
  REPLAY_SWAPS: flag("false"),
  MIRROR_ROUTER_ADDRESS: addressSchema.optional(),
})

// What replaying a swap on the test network goes through, all deployed by apps/contracts
export type ReplayContracts = { faucet: Address; usdc: Address; poolFactory: Address; router: Address }

export type RelayConfig = {
  mainnetRpcUrl: string
  testnetRpcUrl: string
  mirrorAddress: Address
  privateKey: Hex | undefined
  pollSeconds: number
  minTickMove: number
  minLiquidityMovePercent: number
  maxAgeSeconds: number
  batchSize: number
  isDryRun: boolean
  poolsFile: string
  // Find the stock pools the Stocks API names, instead of reading the file
  isDiscovering: boolean
  // The Stocks API, which every stock and its pool is read from when discovering
  stocksApi: StocksApi | undefined
  // Copy the mainnet pools' swaps onto their copies, as a market maker would
  isReplaying: boolean
  // Missing on a dry run, which only reads
  contracts: ReplayContracts | undefined
}

function contractsOf(parsed: z.infer<typeof configSchema>): ReplayContracts | undefined {
  const { FAUCET_ADDRESS: faucet, TEST_USDC_ADDRESS: usdc, POOL_FACTORY_ADDRESS: poolFactory, MIRROR_ROUTER_ADDRESS: router } = parsed
  if (!faucet || !usdc || !poolFactory || !router) return undefined
  return { faucet, usdc, poolFactory, router }
}

export function readRelayConfig(env: NodeJS.ProcessEnv): RelayConfig {
  const parsed = configSchema.parse(env)
  checkKeyForLiveRun(parsed)
  const stocksApi = stocksApiOf(parsed)
  if (parsed.DISCOVER_POOLS) requireStocksApi(stocksApi)

  const contracts = contractsOf(parsed)
  const needsContracts = parsed.REPLAY_SWAPS && !parsed.DRY_RUN && !contracts
  if (needsContracts) throw new Error("FAUCET_ADDRESS, TEST_USDC_ADDRESS, POOL_FACTORY_ADDRESS and MIRROR_ROUTER_ADDRESS are needed to replay swaps")

  return {
    mainnetRpcUrl: parsed.MAINNET_RPC_URL,
    testnetRpcUrl: parsed.TESTNET_RPC_URL,
    mirrorAddress: parsed.MIRROR_ADDRESS,
    privateKey: parsed.RELAYER_PRIVATE_KEY,
    pollSeconds: parsed.POLL_SECONDS,
    minTickMove: parsed.MIN_TICK_MOVE,
    minLiquidityMovePercent: parsed.MIN_LIQUIDITY_MOVE_PERCENT,
    maxAgeSeconds: parsed.MAX_AGE_SECONDS,
    batchSize: parsed.BATCH_SIZE,
    isDryRun: parsed.DRY_RUN,
    poolsFile: parsed.POOLS_FILE,
    isDiscovering: parsed.DISCOVER_POOLS,
    stocksApi,
    isReplaying: parsed.REPLAY_SWAPS,
    contracts,
  }
}
