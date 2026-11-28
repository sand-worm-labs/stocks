import { maxUint256, type Address, type PublicClient } from "viem"
import { describe, expect, it } from "vitest"
import type { ReplayContracts } from "../../../src/core/config/relay.config.js"
import type { Testnet } from "../../../src/infrastructure/base-sepolia/testnet-clients.js"
import { fundingCalls, swapCall, type CopyTrade } from "../../../src/features/replay/maker.js"
import { addressOf } from "../../support/addresses.js"

const MAKER = addressOf(50)
const contracts: ReplayContracts = { faucet: addressOf(10), usdc: addressOf(11), poolFactory: addressOf(12), router: addressOf(13) }
const STOCK = addressOf(20)

const copy = { token0: STOCK, token1: contracts.usdc, tickSpacing: 100 }
const stockIn: CopyTrade = { pool: addressOf(1), isToken0In: true, amountIn: 500n, copy }
const usdcIn: CopyTrade = { pool: addressOf(1), isToken0In: false, amountIn: 900n, copy }

// A test network where the maker holds the balances and allowances given, by token
function fakeChain(held: { balance?: Record<Address, bigint>; allowance?: Record<Address, bigint> } = {}): Testnet {
  return {
    wallet: { account: { address: MAKER } },
    testnet: {
      readContract: async ({ address, functionName }: { address: Address; functionName: string }) =>
        functionName === "balanceOf" ? (held.balance?.[address] ?? 0n) : (held.allowance?.[address] ?? 0n),
    } as unknown as PublicClient,
  } as unknown as Testnet
}

describe("fundingCalls", () => {
  it("mints what the maker lacks of a stock through the faucet, and lets the router take it", async () => {
    const calls = await fundingCalls(fakeChain(), contracts, [stockIn])
    expect(calls.map(({ address, functionName, args }) => [address, functionName, args])).toEqual([
      [contracts.faucet, "ownerMint", [STOCK, MAKER, 500n]],
      [STOCK, "approve", [contracts.router, maxUint256]],
    ])
  })

  it("mints test USDC through its own mint", async () => {
    const calls = await fundingCalls(fakeChain(), contracts, [usdcIn])
    expect(calls[0]).toMatchObject({ address: contracts.usdc, functionName: "mint", args: [MAKER, 900n] })
  })

  it("mints only the shortfall, and asks for no approval it already has", async () => {
    const chain = fakeChain({ balance: { [STOCK]: 300n }, allowance: { [STOCK]: maxUint256 } })
    const calls = await fundingCalls(chain, contracts, [stockIn])
    expect(calls.map(({ functionName, args }) => [functionName, args])).toEqual([["ownerMint", [STOCK, MAKER, 200n]]])
  })

  it("asks for nothing when the maker has the tokens and the approval", async () => {
    const chain = fakeChain({ balance: { [STOCK]: 500n }, allowance: { [STOCK]: 500n } })
    expect(await fundingCalls(chain, contracts, [stockIn])).toEqual([])
  })

  it("adds up what two trades in one token need", async () => {
    const calls = await fundingCalls(fakeChain(), contracts, [stockIn, { ...stockIn, amountIn: 250n }])
    expect(calls[0]).toMatchObject({ functionName: "ownerMint", args: [STOCK, MAKER, 750n] })
  })
})

describe("swapCall", () => {
  it("swaps the token in for the other one, in the copy found by its tick spacing, with no floor on what it gets", () => {
    const call = swapCall(contracts, MAKER, usdcIn)
    expect(call).toMatchObject({ address: contracts.router, functionName: "exactInputSingle" })
    expect(call.args?.[0]).toEqual({
      tokenIn: contracts.usdc,
      tokenOut: STOCK,
      tickSpacing: 100,
      recipient: MAKER,
      deadline: 0n,
      amountIn: 900n,
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    })
  })
})
