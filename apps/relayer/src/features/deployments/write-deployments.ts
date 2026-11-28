import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { Address } from "viem"
import type { Pool } from "../../common/pool.type.js"
import type { DeploymentsConfig } from "../../core/config/deployments.config.js"
import type { Deployment } from "./read-deployment.js"
import { mainnetRecords, marketsOf, testnetRecords } from "./records.js"
import { indexReadme } from "./readme.js"
import type { CodeCheck } from "./verify-code.js"

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n"

// Everything there is to know about what is deployed, as files: the mainnet side, the test network's side, and the markets that tie them together.
// The chain says all of it, so this can be made again at any time.
export async function writeDeployments(config: DeploymentsConfig, deployment: Deployment, mainnetPools: Pool[], codeChecks: CodeCheck[], deployer: Address): Promise<void> {
  const mainnet = mainnetRecords(mainnetPools, deployment)
  const testnet = testnetRecords(config, deployment, codeChecks, deployer)
  const markets = marketsOf(mainnetPools, config, deployment)

  const mainnetDirectory = join(config.directory, "base-mainnet")
  const testnetDirectory = join(config.directory, "base-sepolia")
  await Promise.all([mkdir(mainnetDirectory, { recursive: true }), mkdir(testnetDirectory, { recursive: true })])

  await Promise.all([
    writeFile(join(mainnetDirectory, "contracts.json"), json(mainnet.contracts)),
    writeFile(join(mainnetDirectory, "tokens.json"), json(mainnet.tokens)),
    writeFile(join(mainnetDirectory, "pools.json"), json(mainnet.pools)),
    writeFile(join(testnetDirectory, "contracts.json"), json(testnet.contracts)),
    writeFile(join(testnetDirectory, "tokens.json"), json(testnet.tokens)),
    writeFile(join(testnetDirectory, "pools.json"), json(testnet.pools)),
    writeFile(join(config.directory, "markets.json"), json(markets)),
    writeFile(join(config.directory, "README.md"), indexReadme({ deployer, testnetContracts: testnet.contracts.contracts, mainnetPools: mainnet.pools.length, mainnetCopied: markets.length, testTokens: testnet.tokens.length })),
  ])
}
