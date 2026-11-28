import type { Address, Hex } from "viem"

// Uniswap v3 and Aerodrome Slipstream are contracts that both answer slot0(), with a different number of fields. A Uniswap v4 pool is no contract:
// it is a 32-byte id inside the pool manager, read through the StateView contract.
export const contractKinds = ["uniswap-v3", "aerodrome-cl"] as const

export type ContractKind = (typeof contractKinds)[number]
export type PoolKind = ContractKind | "uniswap-v4"

// What the mirror does not need but a copy of the pool on the test network does: which token is the stock, what it trades against, and how deep it is
export type PoolDetail = { stock: Address; quote: Address; liquidityUsd: number; priceUsd: number }

type PoolBase = {
  name: string
  // The key the pool's state is kept under in the mirror. A contract's own address, and for a v4 pool the end of its id (see `mirrorKeyOf`).
  address: Address
  detail?: PoolDetail
}

export type Pool = PoolBase & ({ kind: ContractKind } | { kind: "uniswap-v4"; poolId: Hex })
