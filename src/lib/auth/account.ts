import { TRADE_CHAIN } from "@/constants/trade"
import { connect } from "@/db/client"
import { profiles, wallets } from "@/db/schema"

import type { DynamicIdentity } from "./dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Makes the person's account here the first time they sign in, and notes any wallet of theirs it hasn't seen. Safe to run on every
// sign-in: what exists is left alone. Only addresses are kept, never a key. Without `DATABASE_URL` there is no account to make (the file
// store has none), so it does nothing.
export async function ensureAccount({ id, wallets: addresses }: DynamicIdentity) {
  const url = process.env.DATABASE_URL
  if (!url) return
  if (!UUID.test(id)) throw new Error("An account's id is a uuid")

  await connect(url).transaction(async (tx) => {
    await tx.insert(profiles).values({ userId: id }).onConflictDoNothing()
    if (addresses.length)
      await tx
        .insert(wallets)
        .values(addresses.map((address) => ({ userId: id, address, chainId: TRADE_CHAIN.id })))
        .onConflictDoNothing()
  })
}
