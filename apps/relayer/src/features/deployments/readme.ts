import type { Address } from "viem"

type Summary = {
  deployer: Address
  testnetContracts: Record<string, { address: Address }>
  mainnetPools: number
  mainnetCopied: number
  testTokens: number
}

// The page that says what is in the folder, with the contracts, which are what anyone looking for an address wants first
export function indexReadme({ deployer, testnetContracts, mainnetPools, mainnetCopied, testTokens }: Summary): string {
  const rows = Object.entries(testnetContracts).map(([name, { address }]) => `| ${name} | \`${address}\` |`)
  return [
    "# Deployments",
    "",
    "What is deployed, on the Base mainnet the relayer reads and on the Base Sepolia test network it writes. Written by `pnpm deployments` in `apps/relayer`, from what the",
    "chain and the Stocks API say, so run it again after a deploy or after `pnpm provision`. It writes nothing unless every contract on the test network is the code",
    "`apps/contracts` compiles now and the contracts are tied to each other.",
    "",
    "## Base Sepolia contracts",
    "",
    `Deployed and owned by \`${deployer}\`.`,
    "",
    "| Contract | Address |",
    "| --- | --- |",
    ...rows,
    "",
    "## Files",
    "",
    "| File | What it lists |",
    "| --- | --- |",
    "| `markets.json` | each stock that has a copy: its mainnet token and pool, and its test token and the pool that copies it |",
    `| \`base-mainnet/tokens.json\`, \`pools.json\` | the stock tokens and the ${mainnetPools} pools the relayer mirrors, each marked as copied or not (${mainnetCopied} are) |`,
    "| `base-mainnet/contracts.json` | the mainnet contracts the relayer reads: USDC, Multicall3, Uniswap v4's pool manager and StateView |",
    `| \`base-sepolia/contracts.json\` | the contracts above, each checked against the compiled code |`,
    `| \`base-sepolia/tokens.json\`, \`pools.json\` | the ${testTokens} test tokens, and the pools that copy mainnet pools |`,
    "",
    "A Uniswap v4 pool has no address, only an id, so it appears by `poolId` and by the `mirrorKey` (the last 20 bytes of its id) the mirror keeps its price under.",
    "",
  ].join("\n")
}
