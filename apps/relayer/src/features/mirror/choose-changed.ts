import type { Address } from "viem"
import type { PoolState } from "./state.type.js"

// What was last written for a pool: where its price was and how deep it was, and when
export type Posted = { tick: number; liquidity: bigint; postedAtSeconds: number }

type Choice = {
  latest: Map<Address, PoolState>
  posted: Map<Address, Posted>
  nowSeconds: number
  minTickMove: number
  // How far the depth may move, in percent, before it is written again
  minLiquidityMovePercent: number
  maxAgeSeconds: number
}

// Whether the depth is now more than `percent` away from what was written. A pool that had none moves as soon as it has some.
function hasLiquidityMoved(before: bigint, now: bigint, percent: number): boolean {
  const difference = now > before ? now - before : before - now
  return difference * 100n > before * BigInt(percent)
}

// A write costs gas, so a pool is written only when it is new, its price or its depth has moved, or it has gone too long without one. The depth matters
// as much as the price: it decides how far a trade moves the price in the copy, and a concentrated pool's depth swings without its price moving.
export function chooseChanged(choice: Choice): Address[] {
  const chosen: Address[] = []
  for (const [address, state] of choice.latest) {
    const before = choice.posted.get(address)
    if (!before) {
      chosen.push(address)
      continue
    }
    const hasMoved = Math.abs(state.tick - before.tick) >= choice.minTickMove
    const isDeeperOrThinner = hasLiquidityMoved(before.liquidity, state.liquidity, choice.minLiquidityMovePercent)
    const isStale = choice.nowSeconds - before.postedAtSeconds >= choice.maxAgeSeconds
    if (hasMoved || isDeeperOrThinner || isStale) chosen.push(address)
  }
  return chosen
}
