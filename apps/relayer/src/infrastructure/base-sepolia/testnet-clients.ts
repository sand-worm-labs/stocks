import { createPublicClient, createWalletClient, http, type Hex, type PublicClient, type WalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"

export type Testnet = { wallet: WalletClient; testnet: PublicClient }

// A client that reads the test network. It gets no chain object, as the mainnet's does not: a read does not need one, so a multicall is told where Multicall3 is.
export function connectTestnetReader(rpcUrl: string): PublicClient {
  return createPublicClient({ transport: http(rpcUrl) })
}

// The relayer's wallet, which writes to the test network, and a client that reads it
export function connectTestnet(rpcUrl: string, privateKey: Hex | undefined): Testnet {
  if (!privateKey) throw new Error("RELAYER_PRIVATE_KEY is not set")
  const account = privateKeyToAccount(privateKey)

  return {
    wallet: createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) }),
    testnet: connectTestnetReader(rpcUrl),
  }
}
