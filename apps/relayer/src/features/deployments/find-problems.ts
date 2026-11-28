import type { Address } from "viem"
import type { DeploymentsConfig } from "../../core/config/deployments.config.js"
import type { CodeCheck } from "./verify-code.js"
import type { Deployment } from "./read-deployment.js"

const sameAddress = (a: Address, b: Address) => a.toLowerCase() === b.toLowerCase()

// What is wrong with a deployment, in plain words; nothing when it is what apps/contracts makes and its parts are tied to each other
export function findProblems(deployment: Deployment, { contracts }: DeploymentsConfig, codeChecks: CodeCheck[]): string[] {
  const problems: string[] = []

  for (const check of codeChecks.filter(({ isRight }) => !isRight)) {
    problems.push(`${check.name} at ${check.address}: ${check.reason}`)
  }

  const { owners, links } = deployment
  if (!sameAddress(links.factoryRouter, contracts.MirrorRouter)) problems.push(`the pool factory's router is ${links.factoryRouter}, not the router deployed with it`)
  if (!sameAddress(links.factoryBook, contracts.MirrorBook)) problems.push(`the pool factory reads prices from ${links.factoryBook}, not the mirror book`)

  // The relayer's one wallet deploys, owns the test tokens and writes the mirror, so these must all be the same account
  const accounts = [owners.faucet, owners.usdc, owners.factory, owners.book]
  if (!accounts.every((account) => sameAddress(account, owners.faucet))) problems.push("the faucet, the test USDC, the factory and the mirror book do not share one owner")

  const copied = new Set(deployment.pools.map(({ mainnetPool }) => mainnetPool.toLowerCase()))
  if (copied.size !== deployment.pools.length) problems.push("two copies stand for one mainnet pool")
  return problems
}
