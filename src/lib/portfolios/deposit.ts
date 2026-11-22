import { NETWORK_FEE, SWAP_FEE_RATE } from "@/constants/trade"

import { portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// Where new money would go. It goes to the stocks furthest under their cap, none past it, and what no stock has room
// for stays as cash. Nothing is sold.
export function splitDeposit(portfolio: Portfolio, amount: number, cap: number) {
  const total = (portfolioValue(portfolio) ?? 0) + amount
  const room = portfolio.holdings.map(({ symbol, value }) => ({ symbol, room: Math.max(cap * total - value, 0) }))
  const available = room.reduce((sum, { room }) => sum + room, 0)
  const spend = Math.min(amount, available)

  const buys = room.map(({ symbol, room }) => ({ symbol, spend: available ? (room / available) * spend : 0 }))
  const fees = spend * SWAP_FEE_RATE + (spend > 0 ? NETWORK_FEE : 0)

  return { buys: buys.filter((buy) => buy.spend > 0.005), invested: spend, cash: amount - spend, fees }
}
