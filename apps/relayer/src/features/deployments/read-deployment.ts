import type { Address, PublicClient } from "viem"
import type { DeploymentsConfig } from "../../core/config/deployments.config.js"
import { MULTICALL3 } from "../../infrastructure/base-mainnet/base-mainnet.constants.js"
import { deploymentAbi } from "../../infrastructure/base-sepolia/testnet.abis.js"
import { copyPoolAbi } from "../../infrastructure/base-sepolia/testnet.abis.js"

export type TestToken = { address: Address; symbol: string; name: string; decimals: number }

// A copy of a mainnet pool, and the mainnet pool it copies (by its key in the mirror)
export type CopyPool = { address: Address; mainnetPool: Address; token0: Address; token1: Address; tickSpacing: number; feeBps: number }

export type Deployment = {
  owners: { faucet: Address; usdc: Address; factory: Address; book: Address }
  // What the factory and the router say they are tied to, which must be the contracts deployed with them
  links: { factoryRouter: Address; factoryBook: Address }
  tokens: TestToken[]
  pools: CopyPool[]
}

const multicall = { multicallAddress: MULTICALL3, batchSize: 0 }

// What is on the chain, by asking the contracts themselves: the faucet's every token and the factory's every copy, whatever file was written at the time
export async function readDeployment(client: PublicClient, { contracts }: DeploymentsConfig): Promise<Deployment> {
  const abi = deploymentAbi
  const [faucetOwner, usdcOwner, factoryOwner, bookRelayer, factoryRouter, factoryBook, tokenCount, poolCount] = await client.multicall({
    ...multicall,
    allowFailure: false,
    contracts: [
      { address: contracts.StockFaucet, abi, functionName: "owner" },
      { address: contracts.TestUSDC, abi, functionName: "owner" },
      { address: contracts.MirrorPoolFactory, abi, functionName: "owner" },
      { address: contracts.MirrorBook, abi, functionName: "relayer" },
      { address: contracts.MirrorPoolFactory, abi, functionName: "router" },
      { address: contracts.MirrorPoolFactory, abi, functionName: "book" },
      { address: contracts.StockFaucet, abi, functionName: "tokenCount" },
      { address: contracts.MirrorPoolFactory, abi, functionName: "poolCount" },
    ],
  })

  const [tokens, pools] = await Promise.all([
    readTokens(client, contracts.StockFaucet, Number(tokenCount)),
    readPools(client, contracts.MirrorPoolFactory, Number(poolCount)),
  ])
  return {
    owners: { faucet: faucetOwner, usdc: usdcOwner, factory: factoryOwner, book: bookRelayer },
    links: { factoryRouter, factoryBook },
    tokens,
    pools,
  }
}

function indexes(count: number): bigint[] {
  return Array.from({ length: count }, (_, index) => BigInt(index))
}

async function readTokens(client: PublicClient, faucet: Address, count: number): Promise<TestToken[]> {
  const abi = deploymentAbi
  const addresses = await client.multicall({
    ...multicall,
    allowFailure: false,
    contracts: indexes(count).map((index) => ({ address: faucet, abi, functionName: "tokens" as const, args: [index] as const })),
  })
  const details = await Promise.all(
    (["name", "symbol", "decimals"] as const).map((functionName) =>
      client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi, functionName })) }),
    ),
  )
  const [names, symbols, decimals] = details
  return addresses.map((address, index) => ({
    address,
    name: String(names?.[index]),
    symbol: String(symbols?.[index]),
    decimals: Number(decimals?.[index]),
  }))
}

async function readPools(client: PublicClient, factory: Address, count: number): Promise<CopyPool[]> {
  const addresses = await client.multicall({
    ...multicall,
    allowFailure: false,
    contracts: indexes(count).map((index) => ({ address: factory, abi: deploymentAbi, functionName: "pools" as const, args: [index] as const })),
  })
  const [mainnetPools, feeBps, token0s, token1s, tickSpacings] = await Promise.all([
    client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi: deploymentAbi, functionName: "mainnetPool" as const })) }),
    client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi: deploymentAbi, functionName: "feeBps" as const })) }),
    client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi: copyPoolAbi, functionName: "token0" as const })) }),
    client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi: copyPoolAbi, functionName: "token1" as const })) }),
    client.multicall({ ...multicall, allowFailure: false, contracts: addresses.map((address) => ({ address, abi: copyPoolAbi, functionName: "tickSpacing" as const })) }),
  ])
  return addresses.map((address, index) => ({
    address,
    mainnetPool: mainnetPools[index] as Address,
    token0: token0s[index] as Address,
    token1: token1s[index] as Address,
    tickSpacing: Number(tickSpacings[index]),
    feeBps: Number(feeBps[index]),
  }))
}
