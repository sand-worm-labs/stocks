import { z } from "zod"

import { BASE_RPC_URL } from "@/constants/markets"

export type Transfer = {
  hash: string
  block: number
  // When it happened, worked out from how many blocks ago it was
  at: number
  from: string
  to: string
  amount: number
}

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
// Base makes a block every 200 ms: about the last hour of them
const BLOCK_MS = 200
const WINDOW_BLOCKS = (60 * 60 * 1000) / BLOCK_MS
const CACHE_MS = 30 * 1000
const KEPT = 1000

const logsSchema = z.object({
  result: z.array(
    z.object({ transactionHash: z.string(), blockNumber: z.string(), topics: z.array(z.string()), data: z.string() })
  ),
})

const headSchema = z.object({ result: z.string() })

const rpc = async (method: string, params: unknown[]): Promise<unknown> => {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  return response.json()
}

const cache = new Map<string, { at: number; transfers: Transfer[] }>()

export async function getTransfers(address: string, decimals: number): Promise<Transfer[]> {
  const cached = cache.get(address)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.transfers

  try {
    const head = parseInt(headSchema.parse(await rpc("eth_blockNumber", [])).result, 16)
    const { result } = logsSchema.parse(
      await rpc("eth_getLogs", [
        { address, fromBlock: `0x${(head - WINDOW_BLOCKS).toString(16)}`, toBlock: "latest", topics: [TRANSFER] },
      ])
    )
    const now = Date.now()

    const transfers = result
      .filter(({ topics }) => topics.length === 3)
      .map(({ transactionHash, blockNumber, topics, data }) => {
        const block = parseInt(blockNumber, 16)
        return {
          hash: transactionHash,
          block,
          at: now - (head - block) * BLOCK_MS,
          from: `0x${topics[1]?.slice(26)}`,
          to: `0x${topics[2]?.slice(26)}`,
          amount: Number(BigInt(data)) / 10 ** decimals,
        }
      })
      .reverse()
      .slice(0, KEPT)

    cache.set(address, { at: Date.now(), transfers })
    return transfers
  } catch {
    return cached?.transfers ?? []
  }
}

export function activeWallets(transfers: Transfer[], exclude: string[]) {
  const skip = new Set(exclude.map((address) => address.toLowerCase()))
  const wallets = new Map<string, { address: string; transfers: number; received: number; sent: number }>()

  for (const { from, to, amount } of transfers) {
    for (const [address, side] of [
      [from, "sent"],
      [to, "received"],
    ] as const) {
      if (skip.has(address.toLowerCase())) continue
      const wallet = wallets.get(address) ?? { address, transfers: 0, received: 0, sent: 0 }
      wallet.transfers += 1
      wallet[side] += amount
      wallets.set(address, wallet)
    }
  }

  return Array.from(wallets.values()).sort((a, b) => b.received + b.sent - (a.received + a.sent))
}
