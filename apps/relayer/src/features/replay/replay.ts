import type { PublicClient } from "viem"
import { errorMessage, log } from "../../common/log.js"
import type { Pool } from "../../common/pool.type.js"
import type { RelayConfig, ReplayContracts } from "../../core/config/relay.config.js"
import { readSwaps } from "../../infrastructure/base-mainnet/read-swaps.js"
import { sendMany, type Outcome } from "../../infrastructure/base-sepolia/send.js"
import { connectTestnet, type Testnet } from "../../infrastructure/base-sepolia/testnet-clients.js"
import { readCopy, type Copies } from "./copies.js"
import { fundingCalls, swapCall, type CopyTrade } from "./maker.js"
import { aggregateSwaps, type Trade } from "./trades.js"

// The most blocks one round looks back over, so a relayer that was stopped for a while does not replay an hour of trades at once
const MOST_BLOCKS_PER_ROUND = 150n

export type Replay = {
  // The first mainnet block not yet replayed. Missing before the first round, which starts from now and does not replay the past.
  nextBlock: bigint | undefined
  copies: Copies
}

export function createReplay(): Replay {
  return { nextBlock: undefined, copies: new Map() }
}

// The swaps the mainnet's traders made in these pools since the last round, made again in their copies by the maker. The mirror has already been
// brought to the same block, so each trade is priced as the mainnet's was.
export async function replayRound(config: RelayConfig, mainnet: PublicClient, pools: Pool[], toBlock: bigint, replay: Replay): Promise<void> {
  const fromBlock = replay.nextBlock
  if (fromBlock === undefined) {
    replay.nextBlock = toBlock + 1n
    log(`replaying swaps from block ${replay.nextBlock}`)
    return
  }
  if (fromBlock > toBlock) return

  const oldest = toBlock - MOST_BLOCKS_PER_ROUND + 1n
  const from = fromBlock > oldest ? fromBlock : oldest
  const swaps = await readSwaps(mainnet, pools, from, toBlock)
  replay.nextBlock = toBlock + 1n
  if (swaps.length === 0) return

  const trades = aggregateSwaps(swaps)
  log(`blocks ${from}-${toBlock}: ${swaps.length} swaps, ${trades.length} trades to replay`)
  if (config.isDryRun) return

  await makeTrades(config, replay, trades)
}

async function makeTrades(config: RelayConfig, replay: Replay, trades: Trade[]): Promise<void> {
  const { contracts } = config
  if (!contracts) throw new Error("the contracts to replay swaps through are not set")
  const chain = connectTestnet(config.testnetRpcUrl, config.privateKey)

  const copyTrades = await withCopies(chain, contracts, replay, trades)
  if (copyTrades.length === 0) return

  // Funding first, and waited for: a trade is checked against the maker's balance when it is sent
  const funding = await fundingCalls(chain, contracts, copyTrades)
  report("funding", await sendMany(chain, funding))

  const maker = chain.wallet.account?.address
  if (!maker) throw new Error("the wallet client has no account")
  report("trades", await sendMany(chain, copyTrades.map((trade) => swapCall(contracts, maker, trade))))
}

// The trades there is a copy to make them in; a pool nobody has copied yet is left until `provision` has
async function withCopies(chain: Testnet, contracts: ReplayContracts, replay: Replay, trades: Trade[]): Promise<CopyTrade[]> {
  const found = await Promise.all(trades.map(async (trade) => ({ trade, copy: await readCopy(chain, contracts.poolFactory, trade.pool, replay.copies) })))
  return found.flatMap(({ trade, copy }) => (copy ? [{ ...trade, copy }] : []))
}

function report(what: string, outcomes: Outcome[]): void {
  if (outcomes.length === 0) return
  const failed = outcomes.filter(({ result }) => "error" in result)
  log(`${what}: ${outcomes.length - failed.length} of ${outcomes.length} done`)
  for (const { call, result } of failed) {
    if ("error" in result) log(`  ${call.functionName} failed: ${errorMessage(result.error)}`)
  }
}
