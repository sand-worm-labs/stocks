import type { Address, Hex, PublicClient } from "viem"
import { describe, expect, it } from "vitest"
import type { Pool } from "../../../src/common/pool.type.js"
import { UNISWAP_V4_POOL_MANAGER } from "../../../src/infrastructure/base-mainnet/base-mainnet.constants.js"
import { readSwaps } from "../../../src/infrastructure/base-mainnet/read-swaps.js"
import { addressOf } from "../../support/addresses.js"

const poolId = `0x${"cd".repeat(32)}` as Hex
const v3: Pool = { name: "A", address: addressOf(1), kind: "uniswap-v3" }
const v4: Pool = { name: "B", address: `0x${"cd".repeat(20)}`, kind: "uniswap-v4", poolId }

type Filter = { address: Address | Address[]; args?: { id?: Hex[] } }
type Log = { address?: Address; args: Record<string, unknown>; blockNumber: bigint; logIndex: number }

// A mainnet whose logs are the ones given, by the address (or the pool manager) they were asked for, and which writes down each request
function fakeMainnet(logs: { contract?: Log[]; v4?: Log[] }) {
  const requests: Filter[] = []
  const client = {
    getLogs: async (filter: Filter) => {
      requests.push(filter)
      return filter.address === UNISWAP_V4_POOL_MANAGER ? (logs.v4 ?? []) : (logs.contract ?? [])
    },
  }
  return { client: client as unknown as PublicClient, requests }
}

describe("readSwaps", () => {
  it("reads a v3 swap from the pool's side: the token it was paid in came in", async () => {
    const { client } = fakeMainnet({
      contract: [
        { address: addressOf(1), args: { amount0: 500n, amount1: -90n }, blockNumber: 10n, logIndex: 0 },
        { address: addressOf(1), args: { amount0: -40n, amount1: 25n }, blockNumber: 10n, logIndex: 1 },
      ],
    })
    const swaps = await readSwaps(client, [v3], 1n, 20n)
    expect(swaps).toEqual([
      { pool: addressOf(1), isToken0In: true, amountIn: 500n },
      { pool: addressOf(1), isToken0In: false, amountIn: 25n },
    ])
  })

  it("reads a v4 swap from the swapper's side: the token it paid is the one that came in", async () => {
    const { client } = fakeMainnet({ v4: [{ args: { id: poolId, amount0: -700n, amount1: 80n }, blockNumber: 11n, logIndex: 0 }] })
    const swaps = await readSwaps(client, [v4], 1n, 20n)
    expect(swaps).toEqual([{ pool: v4.address, isToken0In: true, amountIn: 700n }])
  })

  it("gives the swaps oldest first, whichever kind of pool they were in", async () => {
    const { client } = fakeMainnet({
      contract: [{ address: addressOf(1), args: { amount0: 1n, amount1: -1n }, blockNumber: 15n, logIndex: 3 }],
      v4: [{ args: { id: poolId, amount0: 2n, amount1: -2n }, blockNumber: 12n, logIndex: 0 }],
    })
    const swaps = await readSwaps(client, [v3, v4], 1n, 20n)
    expect(swaps.map(({ pool }) => pool)).toEqual([v4.address, addressOf(1)])
  })

  it("asks for a few pools at a time, because a public node refuses a long list", async () => {
    const pools: Pool[] = Array.from({ length: 25 }, (_, n) => ({ name: `P${n}`, address: addressOf(n + 1), kind: "uniswap-v3" }))
    const { client, requests } = fakeMainnet({})
    await readSwaps(client, pools, 1n, 20n)
    expect(requests.map(({ address }) => (address as Address[]).length)).toEqual([10, 10, 5])
  })

  it("makes no request for a kind of pool it has none of, and ignores a swap that paid in nothing", async () => {
    const { client, requests } = fakeMainnet({ contract: [{ address: addressOf(1), args: { amount0: 0n, amount1: 0n }, blockNumber: 1n, logIndex: 0 }] })
    expect(await readSwaps(client, [v3], 1n, 20n)).toEqual([])
    expect(requests).toHaveLength(1)
  })
})
