import { TRADE_CHAIN } from "@/constants/trade"
import { callStocksApi, stocksApiUrl } from "@/lib/api/stocks-api"

import type { DynamicIdentity } from "./dynamic"

// Makes the person's account here the first time they sign in, and notes any wallet of theirs it hasn't seen. Safe to run on every
// sign-in: what exists is left alone. Only addresses are kept, never a key. Without the Stocks API there is no account to make (the file
// store has none), so it does nothing.
export async function ensureAccount({ id, wallets }: DynamicIdentity) {
  if (!stocksApiUrl()) return

  await callStocksApi("/accounts", {
    method: "POST",
    body: JSON.stringify({ userId: id, wallets, chainId: TRADE_CHAIN.id }),
  })
}
