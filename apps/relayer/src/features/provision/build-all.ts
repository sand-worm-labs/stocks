import type { Address } from "viem"
import { errorMessage, log } from "../../common/log.js"
import { connectTestnet } from "../../infrastructure/base-sepolia/testnet-clients.js"
import type { ProvisionConfig } from "../../core/config/provision.config.js"
import type { Plan } from "./plan.js"
import { readSalts } from "./salts.js"
import { build, type Built, type Chain } from "./steps.js"

// By test symbol: the test stock and the copy of the pool, and which mainnet pool it copies
export type BuiltMarket = Record<string, Built & { mainnetPool: Address }>

// Builds each plan on the test network. One stock failing (a symbol the faucet refuses, a reverted seed) must not stop the others;
// running again picks it up where it stopped.
export async function buildAll(config: ProvisionConfig, plans: Plan[]): Promise<BuiltMarket> {
  const chain = await connect(config)
  const market: BuiltMarket = {}

  for (const plan of plans) {
    try {
      const built = await build(chain, plan)
      market[plan.testSymbol] = { ...built, mainnetPool: plan.mainnetPool }
      log(`${plan.testSymbol}: ${built.stock} / pool ${built.pool}`)
    } catch (error) {
      log(`${plan.testSymbol} failed: ${errorMessage(error)}`)
    }
  }
  return market
}

async function connect(config: ProvisionConfig): Promise<Chain> {
  return {
    ...connectTestnet(config.testnetRpcUrl, config.privateKey),
    faucet: config.faucet,
    usdc: config.usdc,
    poolFactory: config.poolFactory,
    salts: await readSalts(config.saltsFile),
  }
}
