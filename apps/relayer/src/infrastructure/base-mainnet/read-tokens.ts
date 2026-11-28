import type { Address, PublicClient } from "viem"
import { MULTICALL3, NATIVE_ETH } from "./base-mainnet.constants.js"
import { erc20Abi } from "./mainnet.abis.js"

export type TokenInfo = { symbol: string; decimals: number }

// The chain's own ETH is no contract, so it answers no calls
const NATIVE: TokenInfo = { symbol: "ETH", decimals: 18 }

// What each token calls itself, and how many decimals it counts in. A token that does not answer is left out.
export async function readTokens(client: PublicClient, tokens: Address[]): Promise<Map<Address, TokenInfo>> {
  const contracts = tokens.filter((token) => token !== NATIVE_ETH)
  const options = { multicallAddress: MULTICALL3, batchSize: 0 }
  const [symbols, decimals] = await Promise.all([
    client.multicall({ ...options, contracts: contracts.map((address) => ({ address, abi: erc20Abi, functionName: "symbol" as const })) }),
    client.multicall({ ...options, contracts: contracts.map((address) => ({ address, abi: erc20Abi, functionName: "decimals" as const })) }),
  ])

  const infos = new Map<Address, TokenInfo>([[NATIVE_ETH, NATIVE]])
  contracts.forEach((token, index) => {
    const symbol = symbols[index]
    const decimal = decimals[index]
    if (symbol?.status !== "success" || decimal?.status !== "success") return
    infos.set(token, { symbol: symbol.result, decimals: decimal.result })
  })
  return infos
}
