import { log } from "../../common/log.js"
import { connectMainnet } from "../../infrastructure/base-mainnet/mainnet-client.js"
import type { ProvisionConfig } from "../../core/config/provision.config.js"
import { discoverPools } from "../discovery/discover-pools.js"
import { planPool, type Plan } from "./plan.js"
import { readShape } from "./read-shape.js"

// A plan for each stock pool the relayer can read and the test network can copy. The rest are logged with the reason they were left out.
export async function planAll(config: ProvisionConfig): Promise<Plan[]> {
  const { pools, skipped } = await discoverPools(config.stocksApi)
  if (skipped.length > 0) log(`cannot read yet: ${skipped.join(", ")}`)

  const mainnet = connectMainnet(config.mainnetRpcUrl)
  const plans: Plan[] = []
  for (const pool of pools) {
    const shaped = await readShape(mainnet, pool)
    if ("skipped" in shaped) {
      log(shaped.skipped)
      continue
    }

    const planned = planPool(pool, shaped.shape)
    if ("skipped" in planned) {
      log(planned.skipped)
      continue
    }
    plans.push(planned.plan)
  }
  return plans
}
