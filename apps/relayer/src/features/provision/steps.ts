import { keccak256, toBytes, zeroAddress, type Address, type Hex } from "viem"
import { send } from "../../infrastructure/base-sepolia/send.js"
import { faucetAbi, poolFactoryAbi, tokenAbi } from "../../infrastructure/base-sepolia/testnet.abis.js"
import type { Testnet } from "../../infrastructure/base-sepolia/testnet-clients.js"
import type { Plan } from "./plan.js"

export type Chain = Testnet & {
  faucet: Address
  usdc: Address
  poolFactory: Address
  // A salt per test symbol, mined by apps/contracts/tools/mine-vanity.sh, so the stock lands at an address like its mainnet twin's
  salts: Record<string, Hex>
}

export type Built = { stock: Address; pool: Address }

async function stockOf(chain: Chain, testSymbol: string): Promise<Address> {
  return chain.testnet.readContract({ address: chain.faucet, abi: faucetAbi, functionName: "stockBySymbol", args: [keccak256(toBytes(testSymbol))] })
}

// The test stock for a mainnet one: made once, at the salted address when there is a salt for it
export async function ensureStock(chain: Chain, plan: Plan): Promise<Address> {
  const known = await stockOf(chain, plan.testSymbol)
  if (known !== zeroAddress) return known

  const salt = chain.salts[plan.testSymbol]
  const call = salt
    ? { functionName: "createStockAt", args: [plan.testName, plan.testSymbol, salt] }
    : { functionName: "createStock", args: [plan.testName, plan.testSymbol] }
  await send(chain, { address: chain.faucet, abi: faucetAbi, ...call })
  return stockOf(chain, plan.testSymbol)
}

// The copy of the mainnet pool: made once, with the mainnet pool's token order
export async function ensurePool(chain: Chain, plan: Plan, stock: Address): Promise<Address> {
  const known = await chain.testnet.readContract({ address: chain.poolFactory, abi: poolFactoryAbi, functionName: "copyOf", args: [plan.mainnetPool] })
  if (known !== zeroAddress) return known

  const [token0, token1] = plan.stockIsToken0 ? [stock, chain.usdc] : [chain.usdc, stock]
  const args = [plan.mainnetPool, token0, token1, plan.tickSpacing, plan.feeBps]
  await send(chain, { address: chain.poolFactory, abi: poolFactoryAbi, functionName: "createPool", args })
  return chain.testnet.readContract({ address: chain.poolFactory, abi: poolFactoryAbi, functionName: "copyOf", args: [plan.mainnetPool] })
}

async function balanceOf(chain: Chain, token: Address, holder: Address): Promise<bigint> {
  return chain.testnet.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [holder] })
}

// Tops the copy's reserves up to the mainnet pool's depth, and never past it, so running this again changes nothing
export async function seedPool(chain: Chain, plan: Plan, stock: Address, pool: Address): Promise<void> {
  const missingUsdc = plan.usdcSeed - (await balanceOf(chain, chain.usdc, pool))
  if (missingUsdc > 0n) await send(chain, { address: chain.usdc, abi: tokenAbi, functionName: "mint", args: [pool, missingUsdc] })

  const missingStock = plan.stockSeed - (await balanceOf(chain, stock, pool))
  if (missingStock > 0n) await send(chain, { address: chain.faucet, abi: faucetAbi, functionName: "ownerMint", args: [stock, pool, missingStock] })
}

export async function build(chain: Chain, plan: Plan): Promise<Built> {
  const stock = await ensureStock(chain, plan)
  const pool = await ensurePool(chain, plan, stock)
  await seedPool(chain, plan, stock, pool)
  return { stock, pool }
}
