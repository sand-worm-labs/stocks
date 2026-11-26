import { jwtVerify, SignJWT } from "jose"

import { SESSION_TTL_SECONDS } from "./auth.constants"
import { settings } from "@/config/settings"

const ISSUER = "sandworm-stocks"
const AUDIENCE = "session"

// Read when it is needed, so the app starts without it and a missing one fails the sign-in with a clear reason
function secret() {
  const value = settings().auth.secret
  if (!value || value.length < 32)
    throw new Error("AUTH_SECRET must be set to a random string of 32 characters or more")
  return new TextEncoder().encode(value)
}

// Our own session for a person Dynamic has verified, kept in an httpOnly cookie. It holds only who they are.
export const signSession = (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret())

export async function readSession(token: string | undefined) {
  if (!token) return undefined
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] })
    return payload.sub
  } catch {
    return undefined
  }
}

export const signChatTicket = (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience("chat")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret())

export async function readChatTicket(ticket: string | null) {
  if (!ticket) return undefined
  try {
    const { payload } = await jwtVerify(ticket, secret(), { issuer: ISSUER, audience: "chat", algorithms: ["HS256"] })
    return payload.sub
  } catch {
    return undefined
  }
}

// A link to one strategy's report that anyone holding it can open, with no sign-in. It names only the strategy and when it stops working,
// and is signed, so it can't be made for another strategy or kept alive past its end.
const SHARE_DAYS = 30

export const signReportShare = (strategyId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(strategyId)
    .setIssuer(ISSUER)
    .setAudience("report-share")
    .setIssuedAt()
    .setExpirationTime(`${SHARE_DAYS}d`)
    .sign(secret())

export async function readReportShare(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: "report-share", algorithms: ["HS256"] })
    return payload.sub
  } catch {
    return undefined
  }
}

// A signed token for one purpose. `audience` says what it is for, and a token only reads as that, so a code can't be used as an access
// token or a session as either. Used by the agent sign-in (lib/auth/oauth.ts).
export const signFor = (audience: string, subject: string, seconds: number, claims: Record<string, unknown> = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(secret())

export async function readFor(audience: string, token: string | undefined) {
  if (!token) return undefined
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience, algorithms: ["HS256"] })
    return payload
  } catch {
    return undefined
  }
}
