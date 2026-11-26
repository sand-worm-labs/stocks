import { z } from "zod"
import { settings } from "@/config/settings"

const response = z.object({ user: z.object({ id: z.string().uuid() }) })

export class SandwormAccountError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

export type SandwormToken = { value: string; expiresAt?: number }
export type SandwormLogin = { access?: SandwormToken; refresh?: SandwormToken }

// One of the cookies Sandworm's login sets, and when it stops working
function tokenFrom(reply: Response, name: string): SandwormToken | undefined {
  const cookie = reply.headers.getSetCookie().find((line) => line.startsWith(`${name}=`))
  if (!cookie) return undefined
  const [pair = "", ...attributes] = cookie.split(";").map((part) => part.trim())
  const expires = attributes.find((part) => part.toLowerCase().startsWith("expires="))?.slice("expires=".length)
  const expiresAt = expires ? Date.parse(expires) : NaN
  return { value: pair.slice(name.length + 1), expiresAt: Number.isNaN(expiresAt) ? undefined : expiresAt }
}

// The person's own tokens on Sandworm, from the cookies its login sets. Kept so research can be done on Sandworm as them. They are theirs and
// nothing more than a browser of theirs would hold, so they are handled like a session: never logged, never sent to the browser but sealed.
const loginOf = (reply: Response): SandwormLogin => ({
  access: tokenFrom(reply, "access_token"),
  refresh: tokenFrom(reply, "refresh_token"),
})

// Makes the person's Sandworm account (or finds the one they have) from their Dynamic sign-in, and returns its id: the id strategies
// belong to from then on, and their access token there. The main app's API checks Dynamic's token itself, so nothing here is taken on the
// browser's word. A new person gets an account made on the spot, with no invite. Without `SANDWORM_API_URL` there is no main app to ask,
// and this returns nothing (the app then keeps going on Dynamic's id, for working locally).
export async function sandwormLogin(token: string) {
  const base = settings().sandworm.apiUrl
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
  return { id: parsed.data.user.id, login: loginOf(reply) }
}

export const sandwormUserId = async (token: string) => (await sandwormLogin(token))?.id

// A new pair of tokens from the refresh token, for when the access token has run out. Nothing back means Sandworm no longer accepts it, and
// the person has to sign in again.
export async function sandwormRefresh(refreshToken: string): Promise<SandwormLogin | undefined> {
  const base = settings().sandworm.apiUrl
  if (!base) return undefined

  const reply = await fetch(`${base.replace(/\/$/, "")}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined)

  if (!reply?.ok) return undefined
  const login = loginOf(reply)
  return login.access ? login : undefined
}
