import { describe, expect, it } from "vitest"
import { choosePools, kindOf } from "../../../src/features/discovery/choose-pools.js"
import type { ApiStock } from "../../../src/infrastructure/stocks-api/stocks-api.js"
import { addressOf } from "../../support/addresses.js"

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const v4Id = "0x" + "cd".repeat(32)

function stock(n: number, pool: string, dex: string, version?: string): ApiStock {
  return { symbol: `S${n}c`, address: addressOf(n), price: 10, liquidity: 900, pool: { address: pool, dex, version, quote: USDC } }
}

describe("kindOf", () => {
  it("knows the exchanges whose pools it can read", () => {
    expect(kindOf("aero", undefined)).toBe("aerodrome-cl")
    expect(kindOf("aerodrome", undefined)).toBe("aerodrome-cl")
    expect(kindOf("uniswap", "v3")).toBe("uniswap-v3")
    expect(kindOf("uniswap", "v4")).toBe("uniswap-v4")
    expect(kindOf("uniswap", "v2")).toBeUndefined()
    expect(kindOf("sushiswap", "v3")).toBeUndefined()
  })
})

describe("choosePools", () => {
  it("takes the pool the API found for each stock, and says which it could not read", () => {
    const { pools, skipped } = choosePools([
      stock(1, addressOf(101), "aerodrome"),
      stock(2, addressOf(102), "uniswap", "v3"),
      stock(3, v4Id, "uniswap", "v4"),
      stock(4, addressOf(104), "sushiswap", "v3"),
    ])

    expect(pools.map(({ name, address, kind }) => [name, address, kind])).toEqual([
      ["S1c", addressOf(101), "aerodrome-cl"],
      ["S2c", addressOf(102), "uniswap-v3"],
      ["S3c", "0x" + "cd".repeat(20), "uniswap-v4"],
    ])
    expect(skipped).toEqual(["S4c (sushiswap v3)"])
  })

  it("keeps what a copy of the pool needs: the token, what it trades against and how deep it is", () => {
    const { pools } = choosePools([stock(1, addressOf(101), "aero")])
    expect(pools[0]?.detail).toEqual({ stock: addressOf(1), quote: USDC, liquidityUsd: 900, priceUsd: 10 })
  })

  it("keeps a v4 pool's id, and the key its state is kept under in the mirror", () => {
    const { pools } = choosePools([stock(3, v4Id, "uniswap", "v4")])
    expect(pools[0]).toMatchObject({ kind: "uniswap-v4", poolId: v4Id, address: "0x" + "cd".repeat(20) })
  })

  it("leaves out a stock with no token, no pool or no price, which has nothing to mirror", () => {
    const { pools, skipped } = choosePools([
      { symbol: "A", pool: undefined },
      { symbol: "B", address: addressOf(2) },
      { ...stock(3, addressOf(103), "aero"), price: undefined },
    ])
    expect(pools).toEqual([])
    expect(skipped).toEqual([])
  })

  it("skips a pool whose address is not what its exchange keeps pools under", () => {
    const { pools, skipped } = choosePools([stock(1, addressOf(101), "uniswap", "v4"), stock(2, v4Id, "aero")])
    expect(pools).toEqual([])
    expect(skipped).toEqual(["S1c (uniswap v4)", "S2c (aero)"])
  })
})
