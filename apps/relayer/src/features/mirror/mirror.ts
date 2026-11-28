import type { Address, PublicClient } from "viem"
import { inBatches } from "../../common/batches.js"
import { errorMessage, log } from "../../common/log.js"
import type { Pool } from "../../common/pool.type.js"
import type { RelayConfig } from "../../core/config/relay.config.js"
import { readMainnet } from "../../infrastructure/base-mainnet/read-mainnet.js"
import { connectTestnet } from "../../infrastructure/base-sepolia/testnet-clients.js"
import { postBatch } from "../../infrastructure/base-sepolia/post-batch.js"
import { chooseChanged, type Posted } from "./choose-changed.js"
import { createReplay, replayRound, type Replay } from "../replay/replay.js"
import type { PoolState } from "./state.type.js"

// What was last written for each pool, so only a pool that moved is written again
export type PostedPools = Map<Address, Posted>

// What the loop remembers from one round to the next
export type MirrorState = { posted: PostedPools; replay: Replay }

export function createMirrorState(): MirrorState {
  return { posted: new Map(), replay: createReplay() }
}

// What one look at the mainnet found
type Round = {
  mainnetBlock: bigint
  states: Map<Address, PoolState>
  changed: Address[]
  nowSeconds: number
}

// One look at the mainnet, a write of whatever moved, and the swaps made there since the last look made again on the test network. A network blip or a
// failed batch must not end the relayer; the next round tries again.
export async function mirrorOnce(config: RelayConfig, mainnet: PublicClient, pools: Pool[], state: MirrorState): Promise<void> {
  try {
    const round = await planRound(config, mainnet, pools, state.posted)
    await mirrorPrices(config, round, state.posted)
    if (config.isReplaying) await replayRound(config, mainnet, pools, round.mainnetBlock, state.replay)
  } catch (error) {
    log(`round failed: ${errorMessage(error)}`)
  }
}

async function mirrorPrices(config: RelayConfig, round: Round, posted: PostedPools): Promise<void> {
  if (round.changed.length === 0) {
    log(`block ${round.mainnetBlock}: nothing moved`)
    return
  }

  log(`block ${round.mainnetBlock}: ${round.changed.length} pools to write`)
  if (config.isDryRun) return

  await writeRound(config, round, posted)
}

async function planRound(config: RelayConfig, mainnet: PublicClient, pools: Pool[], posted: PostedPools): Promise<Round> {
  const { mainnetBlock, states, unreadable } = await readMainnet(mainnet, pools)
  for (const pool of unreadable) log(`could not read ${pool.name} (${pool.address}), skipped`)

  const nowSeconds = Math.floor(Date.now() / 1000)
  const { minTickMove, minLiquidityMovePercent, maxAgeSeconds } = config
  const changed = chooseChanged({ latest: states, posted, nowSeconds, minTickMove, minLiquidityMovePercent, maxAgeSeconds })
  return { mainnetBlock, states, changed, nowSeconds }
}

async function writeRound(config: RelayConfig, round: Round, posted: PostedPools): Promise<void> {
  const chain = connectTestnet(config.testnetRpcUrl, config.privateKey)

  for (const batchPools of inBatches(round.changed, config.batchSize)) {
    const states = batchPools.flatMap((address) => round.states.get(address) ?? [])
    const hash = await postBatch(chain, { mirror: config.mirrorAddress, pools: batchPools, states, mainnetBlock: round.mainnetBlock })
    remember(posted, batchPools, round)
    log(`wrote ${batchPools.length} pools -> ${hash}`)
  }
}

// Only after the batch is confirmed, so a failed batch is tried again next round
function remember(posted: PostedPools, pools: Address[], round: Round): void {
  for (const address of pools) {
    const state = round.states.get(address)
    if (state) posted.set(address, { tick: state.tick, liquidity: state.liquidity, postedAtSeconds: round.nowSeconds })
  }
}
