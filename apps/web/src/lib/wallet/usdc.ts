import { createPublicClient, erc20Abi, formatUnits, http, type PublicClient } from "viem"

import { APP_CHAINS, USDC_ADDRESS, USDC_DECIMALS } from "@/constants/chains"

type AppChain = (typeof APP_CHAINS)[number]

const clients = new Map<number, PublicClient>()

const clientFor = (chain: AppChain) => {
  const existing = clients.get(chain.id)
  if (existing) return existing
  const created = createPublicClient({ chain, transport: http() }) as PublicClient
  clients.set(chain.id, created)
  return created
}

export async function readUsdcBalance(chain: AppChain, address: `0x${string}`) {
  const raw = await clientFor(chain).readContract({
    address: USDC_ADDRESS[chain.id],
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  })
  return Number(formatUnits(raw, USDC_DECIMALS))
}
