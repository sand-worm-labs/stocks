import type { Address } from "viem"
import { describe, expect, it } from "vitest"
import { chooseChanged, type Posted } from "../../../src/features/mirror/choose-changed.js"
import type { PoolState } from "../../../src/features/mirror/state.type.js"

const pool = "0x00000000000000000000000000000000000000a1" as const
const other = "0x00000000000000000000000000000000000000a2" as const

function stateAt(tick: number, liquidity = 1_000n): PoolState {
  return { sqrtPriceX96: 1n, tick, mainnetBlock: 1n, liquidity }
}

const settings = { nowSeconds: 1_000, minTickMove: 10, minLiquidityMovePercent: 10, maxAgeSeconds: 3_600 }

describe("chooseChanged", () => {
  it("writes a pool that was never written", () => {
    const chosen = chooseChanged({ ...settings, latest: new Map([[pool, stateAt(-200)]]), posted: new Map() })
    expect(chosen).toEqual([pool])
  })

  it("leaves a pool alone that has barely moved", () => {
    const posted = new Map<Address, Posted>([[pool, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }]])
    const chosen = chooseChanged({ ...settings, latest: new Map([[pool, stateAt(-195)]]), posted })
    expect(chosen).toEqual([])
  })

  it("writes a pool that moved by the threshold, up or down", () => {
    const posted = new Map<Address, Posted>([
      [pool, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }],
      [other, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }],
    ])
    const latest = new Map([[pool, stateAt(-190)], [other, stateAt(-210)]])
    expect(chooseChanged({ ...settings, latest, posted })).toEqual([pool, other])
  })

  it("writes a pool whose price has not moved but whose depth has, up or down, by more than the threshold", () => {
    const posted = new Map<Address, Posted>([
      [pool, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }],
      [other, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }],
    ])
    const latest = new Map([[pool, stateAt(-200, 1_101n)], [other, stateAt(-200, 899n)]])
    expect(chooseChanged({ ...settings, latest, posted })).toEqual([pool, other])
  })

  it("leaves alone a pool whose depth moved by no more than the threshold", () => {
    const posted = new Map<Address, Posted>([[pool, { tick: -200, liquidity: 1_000n, postedAtSeconds: 900 }]])
    expect(chooseChanged({ ...settings, latest: new Map([[pool, stateAt(-200, 1_100n)]]), posted })).toEqual([])
  })

  it("writes a pool that had no depth as soon as it has some", () => {
    const posted = new Map<Address, Posted>([[pool, { tick: -200, liquidity: 0n, postedAtSeconds: 900 }]])
    expect(chooseChanged({ ...settings, latest: new Map([[pool, stateAt(-200, 1n)]]), posted })).toEqual([pool])
  })

  it("writes a quiet pool once it has gone too long without a write", () => {
    const posted = new Map<Address, Posted>([[pool, { tick: -200, liquidity: 1_000n, postedAtSeconds: -2_700 }]])
    const chosen = chooseChanged({ ...settings, latest: new Map([[pool, stateAt(-200)]]), posted })
    expect(chosen).toEqual([pool])
  })
})
