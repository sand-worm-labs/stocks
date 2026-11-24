import { createPublicClient, http } from "viem"
import { z } from "zod"

import { TRADE_CHAIN } from "@/constants/trade"
import { respond } from "@/lib/api/respond"
import { fill, StrategyError } from "@/lib/strategies/service"
import { getStrategyService } from "@/lib/strategies/source"
import { verifyApproval } from "@/lib/trade/authorize"
import { readUsdcBalance } from "@/lib/wallet/usdc"

const amount = z.number().positive().finite()

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("paper"), amount }),
  z.object({
    mode: z.literal("live"),
    amount,
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    expires: z.string().max(40),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  }),
])

type Context = { params: Promise<{ id: string }> }

// Starts a strategy trading. With paper trading nothing is involved. With a wallet, the owner has signed an approval for up to this much
// of their own USDC, and that is checked against the wallet and the chain first. No money is sent to us or kept: it stays in the wallet.
export const POST = async (request: Request, { params }: Context) =>
  respond(request, body, async (ownerId, trade) => {
    const service = getStrategyService()
    const { id } = await params
    const record = await service.owned(ownerId, id)
    if (record.status !== "draft" || record.stage !== "ready") throw new StrategyError("It isn't ready to trade", 409)

    if (trade.mode === "paper") {
      await service.goLive(ownerId, id, trade.amount, { mode: "paper" })
      return { id }
    }

    const client = createPublicClient({ chain: TRADE_CHAIN, transport: http() })
    await verifyApproval(
      {
        verifyMessage: (args) => client.verifyMessage(args),
        usdcBalance: (address) => readUsdcBalance(TRADE_CHAIN, address),
      },
      {
        strategyId: id,
        address: trade.address as `0x${string}`,
        limit: fill(record, trade.amount).total,
        expires: trade.expires,
        signature: trade.signature as `0x${string}`,
      }
    )
    await service.goLive(ownerId, id, trade.amount, { mode: "live", chainId: TRADE_CHAIN.id, from: trade.address })
    return { id }
  })
