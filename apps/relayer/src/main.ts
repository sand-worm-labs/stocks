import { log } from "./common/log.js"
import { runMode } from "./core/config/env.js"
import { readRelayConfig } from "./core/config/relay.config.js"
import { findPools } from "./features/discovery/find-pools.js"
import { connectMainnet } from "./infrastructure/base-mainnet/mainnet-client.js"
import { createMirrorState, mirrorOnce } from "./features/mirror/mirror.js"

// The relayer: every few seconds, copy the price of each Base mainnet pool that moved onto the MirrorBook on Base Sepolia (`pnpm start`).
async function main(): Promise<void> {
  const config = readRelayConfig(process.env)
  const pools = await findPools(config)
  log(`mirroring ${pools.length} Base mainnet pools to ${config.mirrorAddress} (${runMode(config.isDryRun)})`)

  const mainnet = connectMainnet(config.mainnetRpcUrl)
  const state = createMirrorState()

  while (true) {
    await mirrorOnce(config, mainnet, pools, state)
    await sleep(config.pollSeconds * 1000)
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
