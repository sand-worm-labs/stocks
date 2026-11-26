import { createPublicClient, http } from "viem"
import { z } from "zod"

import { TRADE_CHAIN } from "./trade.constants"
import { type createStrategyService, fill, StrategyError } from "@/features/strategies/lifecycle/strategy-lifecycle"
import { approvalMessage, verifyApproval } from "./authorize"
import { readUsdcBalance } from "@/infrastructure/chain/usdc"

const amount = z.number().positive().finite()

export const tradeSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("paper"), amount }),
  z.object({
    mode: z.literal("live"),
    amount,
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    expires: z.string().max(40),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  }),
])

export type Trade = z.infer<typeof tradeSchema>

// What the approval check needs of the chain, read from the trading chain: whether a signature is the wallet's, and its USDC.
const chainReader = () => {
  const client = createPublicClient({ chain: TRADE_CHAIN, transport: http() })
  return {
    verifyMessage: (args: Parameters<typeof client.verifyMessage>[0]) => client.verifyMessage(args),
    usdcBalance: (address: `0x${string}`) => readUsdcBalance(TRADE_CHAIN, address),
  }
}

// Starts a strategy trading. With paper trading nothing is involved. With a wallet, the owner has signed an approval for up to this much
// of their own USDC, and that is checked against the wallet and the chain first. No money is sent to us or kept: it stays in the wallet.
export async function startTrading(
  service: ReturnType<typeof createStrategyService>,
  ownerId: string,
  id: string,
  trade: Trade
) {
  const record = await service.owned(ownerId, id)
  const isReady = record.status === "draft" && record.stage === "ready"
  if (!isReady) throw new StrategyError("It isn't ready to trade", 409)

  if (trade.mode === "paper") return service.goLive(ownerId, id, trade.amount, { mode: "paper" })

  const address = trade.address as `0x${string}`
  const signature = trade.signature as `0x${string}`
  const approval = { strategyId: id, address, limit: fill(record, trade.amount).total, expires: trade.expires }

  const balance = await verifyApproval(chainReader(), { ...approval, signature })

  return service.goLive(ownerId, id, trade.amount, {
    mode: "live",
    chainId: TRADE_CHAIN.id,
    from: trade.address,
    approval: { message: approvalMessage(approval), signature, balance, expiresAt: trade.expires },
  })
}
