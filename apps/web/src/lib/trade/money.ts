import { z } from "zod"

import { PAPER_DEPOSIT_MAX } from "@/constants/trade"
import type { StrategyService } from "@/lib/strategies/service"

export const fundsSchema = z.object({ direction: z.enum(["add", "remove"]), amount: z.number().positive().max(PAPER_DEPOSIT_MAX) })

// No symbols means everything the strategy holds
export const sellSchema = z.object({ symbols: z.array(z.string().max(20)).max(50).optional(), share: z.number().gt(0).max(1) })

type Funds = z.infer<typeof fundsSchema>
type Sale = z.infer<typeof sellSchema>

// Puts money into a strategy, or takes cash out of it. Both the app and an agent come through here, so they can't disagree on the rules.
export async function changeFunds(service: StrategyService, ownerId: string, id: string, { direction, amount }: Funds) {
  const { record, lines } = direction === "add" ? await service.addFunds(ownerId, id, amount) : await service.removeFunds(ownerId, id, amount)
  return { cash: record.cash, bought: lines.filter(({ kind }) => kind === "buy").length }
}

export async function sellStocks(service: StrategyService, ownerId: string, id: string, sale: Sale) {
  const { record, lines } = await service.sell(ownerId, id, sale)
  const received = lines.reduce((sum, { usdc }) => sum + usdc, 0)
  return { cash: record.cash, received }
}
