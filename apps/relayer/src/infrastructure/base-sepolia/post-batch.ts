import type { Address, Hex } from "viem"
import type { PoolState } from "../../features/mirror/state.type.js"
import { mirrorBookAbi } from "./mirror.abi.js"
import { send } from "./send.js"
import type { Testnet } from "./testnet-clients.js"

type Batch = {
  mirror: Address
  pools: Address[]
  states: PoolState[]
  mainnetBlock: bigint
}

// Waits for the receipt, so a batch that reverted is an error here and not a silent gap in the mirror.
export function postBatch(chain: Testnet, batch: Batch): Promise<Hex> {
  const args = [batch.pools, batch.states, batch.mainnetBlock] as const
  return send(chain, { address: batch.mirror, abi: mirrorBookAbi, functionName: "postMany", args })
}
