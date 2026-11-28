import { describe, expect, it } from "vitest"
import type { Pool } from "../../../src/common/pool.type.js"
import type { DeploymentsConfig } from "../../../src/core/config/deployments.config.js"
import { findProblems } from "../../../src/features/deployments/find-problems.js"
import type { Deployment } from "../../../src/features/deployments/read-deployment.js"
import { mainnetRecords, marketsOf } from "../../../src/features/deployments/records.js"
import { addressOf } from "../../support/addresses.js"

const USDC = addressOf(11)
const config = {
  contracts: { StockFaucet: addressOf(10), TestUSDC: USDC, MirrorPoolFactory: addressOf(12), MirrorBook: addressOf(14), MirrorRouter: addressOf(13) },
} as DeploymentsConfig

const detail = (stock: number) => ({ stock: addressOf(stock), quote: addressOf(99), liquidityUsd: 500, priceUsd: 10 })
const v3: Pool = { name: "AAAc", address: addressOf(1), kind: "uniswap-v3", detail: detail(41) }
const v4: Pool = { name: "BBBc", address: `0x${"cd".repeat(20)}`, kind: "uniswap-v4", poolId: `0x${"cd".repeat(32)}`, detail: detail(42) }
const lonely: Pool = { name: "CCCc", address: addressOf(3), kind: "aerodrome-cl", detail: detail(43) }

const deployment: Deployment = {
  owners: { faucet: addressOf(50), usdc: addressOf(50), factory: addressOf(50), book: addressOf(50) },
  links: { factoryRouter: addressOf(13), factoryBook: addressOf(14) },
  tokens: [
    { address: addressOf(60), symbol: "tAAAc", name: "Test AAAc", decimals: 8 },
    { address: addressOf(61), symbol: "tBBBc", name: "Test BBBc", decimals: 8 },
  ],
  pools: [
    { address: addressOf(70), mainnetPool: addressOf(1), token0: addressOf(60), token1: USDC, tickSpacing: 100, feeBps: 5 },
    { address: addressOf(71), mainnetPool: v4.address, token0: USDC, token1: addressOf(61), tickSpacing: 60, feeBps: 30 },
  ],
}

describe("marketsOf", () => {
  it("ties each copy to the mainnet pool it copies and to its tokens, whichever side the USDC is on", () => {
    const markets = marketsOf([v3, v4, lonely], config, deployment)
    expect(markets.map(({ symbol, testSymbol }) => [symbol, testSymbol])).toEqual([["AAAc", "tAAAc"], ["BBBc", "tBBBc"]])
    expect(markets[1]).toMatchObject({
      mainnet: { pool: `0x${"cd".repeat(32)}`, kind: "uniswap-v4", token: addressOf(42) },
      testnet: { token: addressOf(61), copyPool: addressOf(71), tickSpacing: 60 },
    })
  })
})

describe("mainnetRecords", () => {
  it("says which pools have a copy, and gives a v4 pool its id and not an address", () => {
    const { pools } = mainnetRecords([v3, v4, lonely], deployment)
    expect(pools.map(({ symbol, isCopied }) => [symbol, isCopied])).toEqual([["AAAc", true], ["BBBc", true], ["CCCc", false]])
    expect(pools[1]).toMatchObject({ address: undefined, poolId: `0x${"cd".repeat(32)}`, mirrorKey: v4.address })
    expect(pools[0]).toMatchObject({ address: addressOf(1), poolId: undefined })
  })
})

describe("findProblems", () => {
  const right = [{ name: "MirrorRouter", address: addressOf(13), isRight: true }]

  it("finds none in a deployment whose contracts are the compiled ones and are tied to each other", () => {
    expect(findProblems(deployment, config, right)).toEqual([])
  })

  it("names a contract that is not the compiled one", () => {
    const problems = findProblems(deployment, config, [{ name: "MirrorRouter", address: addressOf(13), isRight: false, reason: "no code" }])
    expect(problems).toEqual([`MirrorRouter at ${addressOf(13)}: no code`])
  })

  it("names a factory tied to some other router or book, and owners that are not one account", () => {
    const wrong: Deployment = { ...deployment, links: { factoryRouter: addressOf(99), factoryBook: addressOf(98) }, owners: { ...deployment.owners, usdc: addressOf(51) } }
    expect(findProblems(wrong, config, right)).toHaveLength(3)
  })

  it("names two copies of one mainnet pool", () => {
    const twice: Deployment = { ...deployment, pools: [deployment.pools[0]!, { ...deployment.pools[0]!, address: addressOf(72) }] }
    expect(findProblems(twice, config, right)).toEqual(["two copies stand for one mainnet pool"])
  })
})
