
import { compactDecrypt, CompactEncrypt } from "jose"
import { cookies } from "next/headers"
import { createHash } from "node:crypto"

import { SANDWORM_COOKIE, SESSION_TTL_SECONDS } from "./config"
import { type SandwormLogin, sandwormRefresh, type SandwormToken } from "./sandworm"

// Read when it is needed, as for the session. The key is made from the same secret, so there is nothing more to keep.
function key() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set to a random string of 32 characters or more")
  return createHash("sha256").update(`sandworm-token:${value}`).digest()
}

// The tokens are sealed, not just signed: they are a login to the person's Sandworm account, so what reaches the browser must not be
// readable there.
export async function sealSandwormLogin(login: SandwormLogin) {
  const plain = JSON.stringify(login)
  return new CompactEncrypt(new TextEncoder().encode(plain)).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).encrypt(key())
}

export async function openSandwormLogin(sealed: string | undefined): Promise<SandwormLogin | undefined> {
  if (!sealed) return undefined
  try {
    const { plaintext } = await compactDecrypt(sealed, key())
    return JSON.parse(new TextDecoder().decode(plaintext)) as SandwormLogin
  } catch {
    return undefined
  }
}

// A token with no end given is taken to work until Sandworm says otherwise
export const works = (token: SandwormToken | undefined, now = Date.now()) =>
  Boolean(token) && (token?.expiresAt === undefined || token.expiresAt > now)

// How long the cookie is kept: as long as the longest-lived token in it works, and never longer than our own session
export function sandwormCookieAge({ access, refresh }: SandwormLogin, now = Date.now()) {
  const ends = [access, refresh].flatMap((token) => (token ? [token.expiresAt] : []))
  const latest = ends.length === 0 || ends.includes(undefined) ? undefined : Math.max(...(ends as number[]))
  const seconds = latest === undefined ? SESSION_TTL_SECONDS : Math.floor((latest - now) / 1000)
  return Math.max(0, Math.min(SESSION_TTL_SECONDS, seconds))
}

export const sandwormCookieOptions = (login: SandwormLogin, secure: boolean) =>
  ({ httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: sandwormCookieAge(login) }) as const

// The person's access token on Sandworm, or nothing when they have to sign in again. One that has run out is renewed from the refresh token,
// and the new pair is kept in the cookie, as Sandworm replaces the refresh token each time it is used. Only for route handlers, which are
// the only place a cookie can be set.
export async function getSandwormToken() {
  const store = await cookies()
  const login = await openSandwormLogin(store.get(SANDWORM_COOKIE)?.value)
  if (!login) return undefined
  if (works(login.access)) return login.access?.value
  if (!login.refresh || !works(login.refresh)) return undefined

  const renewed = await sandwormRefresh(login.refresh.value)
  if (!renewed?.access) return undefined
  const next = { access: renewed.access, refresh: renewed.refresh ?? login.refresh }
  store.set(SANDWORM_COOKIE, await sealSandwormLogin(next), sandwormCookieOptions(next, process.env.NODE_ENV === "production"))
  return renewed.access.value
}
