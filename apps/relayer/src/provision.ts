import { writeFile } from "node:fs/promises"
import { log } from "./common/log.js"
import { runMode } from "./core/config/env.js"
import { readProvisionConfig } from "./core/config/provision.config.js"
import { buildAll } from "./features/provision/build-all.js"
import { planAll } from "./features/provision/plan-all.js"
import { printPlans } from "./features/provision/print-plans.js"

// Builds the test-network side of the mirror: for each Coinbase stock pool the relayer can read, a test stock, a copy of the pool (the same price and
// depth as the mainnet one, kept by the relayer's mirror) and its reserves. Run it again and it only fills what is missing.
//
//   pnpm provision        (DRY_RUN=true, the default, reads the mainnet pools and prints the plan)
async function main(): Promise<void> {
  const config = readProvisionConfig(process.env)
  const plans = await planAll(config)
  log(`${plans.length} pools to copy (${runMode(config.isDryRun)})`)

  if (config.isDryRun) {
    printPlans(plans)
    return
  }

  const market = await buildAll(config, plans)
  await writeFile(config.marketFile, JSON.stringify(market, null, 2) + "\n")
  log(`wrote ${config.marketFile}`)
}

main().catch((error) => {
  log(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
