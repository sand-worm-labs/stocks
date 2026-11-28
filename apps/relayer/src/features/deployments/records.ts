import type { Address, Hex } from "viem"
import type { Pool } from "../../common/pool.type.js"
import type { DeploymentsConfig } from "../../core/config/deployments.config.js"
import { MULTICALL3, UNISWAP_V4_POOL_MANAGER, UNISWAP_V4_STATE_VIEW } from "../../infrastructure/base-mainnet/base-mainnet.constants.js"
import { BASE_USDC } from "../provision/provision.constants.js"
import type { Deployment } from "./read-deployment.js"
import type { CodeCheck } from "./verify-code.js"

// The test symbol is the mainnet one with a "t" in front (NVDAc, tNVDAc)
const mainnetSymbolOf = (testSymbol: string) => testSymbol.replace(/^t/, "")

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// A pool on the mainnet as the record has it. A Uniswap v4 pool is an id and not a contract, so it has no address, only the key the mirror keeps it under.
function mainnetPoolOf(pool: Pool, isCopied: boolean) {
  return {
    symbol: pool.name,
    kind: pool.kind,
    address: pool.kind === "uniswap-v4" ? undefined : pool.address,
    poolId: pool.kind === "uniswap-v4" ? pool.poolId : undefined,
    mirrorKey: pool.address,
    stock: pool.detail?.stock,
    quote: pool.detail?.quote,
    liquidityUsd: pool.detail?.liquidityUsd,
    priceUsd: pool.detail?.priceUsd,
    isCopied,
  }
}

// Base mainnet: what the relayer reads. The pools are the ones it mirrors, and each says whether a copy of it has been made on the test network.
export function mainnetRecords(pools: Pool[], deployment: Deployment) {
  const copied = new Set(deployment.pools.map(({ mainnetPool }) => mainnetPool.toLowerCase()))
  return {
    contracts: {
      network: "base-mainnet",
      chainId: 8453,
      contracts: {
        USDC: { address: BASE_USDC },
        Multicall3: { address: MULTICALL3 },
        UniswapV4PoolManager: { address: UNISWAP_V4_POOL_MANAGER },
        UniswapV4StateView: { address: UNISWAP_V4_STATE_VIEW },
      },
    },
    tokens: pools.map((pool) => ({ symbol: pool.name, address: pool.detail?.stock })),
    pools: pools.map((pool) => mainnetPoolOf(pool, copied.has(pool.address.toLowerCase()))),
  }
}

// Base Sepolia: what `apps/contracts` deployed, with the proof each is the code compiled now, and the test tokens and the copies
export function testnetRecords(config: DeploymentsConfig, deployment: Deployment, codeChecks: CodeCheck[], deployer: Address) {
  const usdc = config.contracts.TestUSDC
  const symbolOf = new Map(deployment.tokens.map((token) => [token.address.toLowerCase(), token.symbol]))

  return {
    contracts: {
      network: "base-sepolia",
      chainId: 84532,
      deployer,
      contracts: Object.fromEntries(codeChecks.map(({ name, address, isRight }) => [name, { address, isTheCompiledContract: isRight }])),
    },
    tokens: deployment.tokens.map((token) => ({
      symbol: token.symbol,
      mainnetSymbol: mainnetSymbolOf(token.symbol),
      name: token.name,
      decimals: token.decimals,
      address: token.address,
    })),
    pools: deployment.pools.map((pool) => {
      const stock = same(pool.token0, usdc) ? pool.token1 : pool.token0
      return {
        symbol: symbolOf.get(stock.toLowerCase()) ?? "?",
        copy: pool.address,
        mainnetPool: pool.mainnetPool,
        token0: pool.token0,
        token1: pool.token1,
        stock,
        quote: usdc,
        tickSpacing: pool.tickSpacing,
        feeBps: pool.feeBps,
      }
    }),
  }
}

// The two sides together, a row for each stock that has a copy: the mainnet token and pool, and the test token and the pool that copies it
export function marketsOf(pools: Pool[], config: DeploymentsConfig, deployment: Deployment) {
  const usdc = config.contracts.TestUSDC
  const symbolOf = new Map(deployment.tokens.map((token) => [token.address.toLowerCase(), token.symbol]))

  return deployment.pools.flatMap((copy) => {
    const mainnet = pools.find((pool) => same(pool.address, copy.mainnetPool))
    const testToken: Hex = same(copy.token0, usdc) ? copy.token1 : copy.token0
    const testSymbol = symbolOf.get(testToken.toLowerCase())
    if (!mainnet || !testSymbol) return []

    const { kind, name } = mainnet
    return [
      {
        symbol: name,
        testSymbol,
        mainnet: {
          token: mainnet.detail?.stock,
          pool: mainnet.kind === "uniswap-v4" ? mainnet.poolId : mainnet.address,
          kind,
          mirrorKey: mainnet.address,
          quote: mainnet.detail?.quote,
        },
        testnet: { token: testToken, copyPool: copy.address, quote: usdc, tickSpacing: copy.tickSpacing, feeBps: copy.feeBps },
      },
    ]
  })
}
