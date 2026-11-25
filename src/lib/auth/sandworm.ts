import { z } from "zod"

const response = z.object({ user: z.object({ id: z.string().uuid() }) })

export class SandwormAccountError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

// Makes the person's Sandworm account (or finds the one they have) from their Dynamic sign-in, and returns its id: the id strategies
// belong to from then on. The main app's API checks Dynamic's token itself, so nothing here is taken on the browser's word. A new
// person gets an account made on the spot, with no invite. Without
// `SANDWORM_API_URL` there is no main app to ask, and this returns nothing (the app then keeps going on Dynamic's id, for working locally).
export async function sandwormUserId(token: string) {
  const base = process.env.SANDWORM_API_URL
  if (!base) return undefined

  const reply = await fetch(`${base.replace(/\/$/, "")}/auth/dynamic/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined)

  if (!reply)
    throw new SandwormAccountError("We couldn't reach Sandworm to set up your account. Try again in a moment", 502)
  if (!reply.ok) throw new SandwormAccountError("Sandworm couldn't set up your account", 502)

  const parsed = response.safeParse(await reply.json().catch(() => undefined))
  if (!parsed.success) throw new SandwormAccountError("Sandworm couldn't set up your account", 502)
  return parsed.data.user.id
}
