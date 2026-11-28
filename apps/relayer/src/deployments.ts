import { mapInBatches } from "./common/batches.js"
import { log } from "./common/log.js"
import { readDeploymentsConfig } from "./core/config/deployments.config.js"
import { discoverPools } from "./features/discovery/discover-pools.js"
import { findProblems } from "./features/deployments/find-problems.js"
import { readDeployment } from "./features/deployments/read-deployment.js"
import { verifyCode } from "./features/deployments/verify-code.js"
import { writeDeployments } from "./features/deployments/write-deployments.js"
import { connectTestnetReader } from "./infrastructure/base-sepolia/testnet-clients.js"

// Writes down what is deployed on the test network, after checking it is the right code: each contract is compared with the one `apps/contracts`
// compiles, and the contracts are checked to be tied to each other. Exits with an error, and writes nothing, when something is wrong.
//
//   pnpm deployments
// A public RPC answers a few reads at a time
const CHECKS_AT_ONCE = 6

async function main(): Promise<void> {
  const config = readDeploymentsConfig(process.env)
  const client = connectTestnetReader(config.testnetRpcUrl)

  const deployment = await readDeployment(client, config)
  const { pools: mainnetPools } = await discoverPools(config.stocksApi)
  log(`${deployment.tokens.length} test tokens, ${deployment.pools.length} pool copies`)

  const codeChecks = await Promise.all(
    Object.entries(config.contracts).map(([name, address]) => verifyCode(client, name, address, config.contractsOut)),
  )
  const copies = [
    ...deployment.pools.map(({ address }) => ({ name: "MirrorPool", address })),
    ...deployment.tokens.map(({ address }) => ({ name: "TestStock", address })),
  ]
  const copyChecks = await mapInBatches(copies, CHECKS_AT_ONCE, ({ name, address }) => verifyCode(client, name, address, config.contractsOut))

  const problems = findProblems(deployment, config, [...codeChecks, ...copyChecks])
  for (const problem of problems) log(`WRONG: ${problem}`)
  if (problems.length > 0) throw new Error(`${problems.length} things are wrong with the deployment; nothing was written`)

  await writeDeployments(config, deployment, mainnetPools, codeChecks, deployment.owners.faucet)
  log(`every contract is the compiled one; wrote ${config.directory}`)
}

main().catch((error) => {
  log(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
