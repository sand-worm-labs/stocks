import { log } from "../../common/log.js"
import type { Pool } from "../../common/pool.type.js"
import { requireStocksApi } from "../../core/config/env.js"
import type { RelayConfig } from "../../core/config/relay.config.js"
import { discoverPools } from "./discover-pools.js"
import { loadPools } from "./load-pools.js"

// The pools to mirror: the ones in the pools file, or with DISCOVER_POOLS the stock pools the Stocks API names
export async function findPools(config: RelayConfig): Promise<Pool[]> {
  if (!config.isDiscovering) return loadPools(config.poolsFile)

  const { pools, skipped } = await discoverPools(requireStocksApi(config.stocksApi))
  if (skipped.length > 0) log(`skipped ${skipped.length} pools it cannot read yet: ${skipped.join(", ")}`)
  return pools
}
