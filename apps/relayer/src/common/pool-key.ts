import type { Address, Hex } from "viem"

// The mirror is keyed by address, and a v4 pool has an id of 32 bytes. The last 20 bytes of a hash stand in for it: two pools sharing them is as unlikely as two sharing an address.
export function mirrorKeyOf(poolId: Hex): Address {
  return `0x${poolId.slice(-40)}`
}
