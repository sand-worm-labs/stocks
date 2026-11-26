import { createHash, timingSafeEqual } from "node:crypto"

import { readFor, signFor } from "./token"

// How an agent such as Claude is given access to a person's Sandworm Stocks: the standard sign-in for MCP (OAuth, with a code and PKCE). The
// agent registers itself, sends the person to the app to sign in and allow it, and is handed a token of its own for that person. Nothing is
// kept on our side: a client, a code and a token are each signed, so each says who and what it is for and when it stops, and can't be made up.

const CLIENT = "oauth-client"
const CODE = "oauth-code"
const ACCESS = "agent"
const REFRESH = "agent-refresh"

export const CODE_SECONDS = 5 * 60
export const ACCESS_SECONDS = 60 * 60
export const REFRESH_SECONDS = 30 * 24 * 60 * 60
export const SCOPE = "stocks"

// What the standard has an authorization server say when it refuses, so the agent can tell what to fix
export class OAuthError extends Error {
  constructor(
    readonly code: "invalid_request" | "invalid_client" | "invalid_grant" | "unsupported_grant_type" | "invalid_redirect_uri" | "invalid_client_metadata",
    message: string
  ) {
    super(message)
  }
}

export type Client = { id: string; name: string; redirectUris: string[] }

// Where an agent may be sent back to: a secure address, or one on the same machine (an agent running locally), and never a fragment
export function isAllowedRedirect(uri: string) {
  try {
    const url = new URL(uri)
    if (url.hash) return false
    if (url.protocol === "https:") return true
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  } catch {
    return false
  }
}

const MOST_REDIRECTS = 5
const NAME_MAX = 80

// An agent says what it is and where to send the person back to, and is given an id that holds exactly that, signed
export async function registerClient(input: unknown) {
  // What arrives is whatever the agent sent; each field is checked below before it is used
  const sent = (typeof input === "object" && input !== null ? input : {}) as { redirect_uris?: unknown; client_name?: unknown }
  const uris = sent.redirect_uris
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > MOST_REDIRECTS || !uris.every((uri) => typeof uri === "string"))
    throw new OAuthError("invalid_redirect_uri", "Give one to five redirect_uris")
  if (!uris.every(isAllowedRedirect)) throw new OAuthError("invalid_redirect_uri", "A redirect_uri has to be https, or on this machine, with no fragment")

  const name = typeof sent.client_name === "string" && sent.client_name.trim() ? sent.client_name.trim().slice(0, NAME_MAX) : "An agent"
  const id = await signFor(CLIENT, "client", 10 * 365 * 24 * 60 * 60, { name, uris })
  return { client_id: id, client_name: name, redirect_uris: uris }
}

export async function readClient(clientId: string | undefined): Promise<Client | undefined> {
  const claims = await readFor(CLIENT, clientId)
  if (!claims || !clientId) return undefined
  const { name, uris } = claims as { name?: string; uris?: string[] }
  return typeof name === "string" && Array.isArray(uris) ? { id: clientId, name, redirectUris: uris } : undefined
}

export type AuthorizeRequest = { clientId: string; redirectUri: string; state?: string; codeChallenge: string }

// The request an agent sends the person's browser with, checked before anything is shown. A request that isn't right is never answered by
// sending the browser back to its redirect address, since that address isn't trusted yet.
export async function checkAuthorizeRequest(params: Record<string, string | undefined>) {
  const client = await readClient(params.client_id)
  if (!client) return { ok: false as const, error: "This agent isn't known. Start the connection again from the agent" }
  if (!params.redirect_uri || !client.redirectUris.includes(params.redirect_uri))
    return { ok: false as const, error: "This agent asked to come back to an address it didn't register" }
  if (params.response_type !== "code") return { ok: false as const, error: "This agent asked for something we don't offer" }
  const challenge = params.code_challenge
  if (!challenge || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge) || params.code_challenge_method !== "S256")
    return { ok: false as const, error: "This agent didn't send the proof key it has to" }

  return { ok: true as const, client, request: { clientId: client.id, redirectUri: params.redirect_uri, state: params.state, codeChallenge: challenge } satisfies AuthorizeRequest }
}

// What the person's allowing becomes: a code the agent swaps for a token, good for five minutes, naming the person, the agent, where it goes
// back to and the proof key it has to answer
export const issueCode = (ownerId: string, { clientId, redirectUri, codeChallenge }: AuthorizeRequest) =>
  signFor(CODE, ownerId, CODE_SECONDS, { cid: clientId, ru: redirectUri, cc: codeChallenge })

export function redirectWith(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri)
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value)
  return url.toString()
}

const sha256Url = (text: string) => createHash("sha256").update(text).digest("base64url")

// Whether the agent holds the secret whose hash it sent when it started
export function proves(verifier: string, challenge: string) {
  const a = Buffer.from(sha256Url(verifier))
  const b = Buffer.from(challenge)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function tokensFor(ownerId: string, clientId: string) {
  return {
    access_token: await signFor(ACCESS, ownerId, ACCESS_SECONDS, { cid: clientId }),
    token_type: "Bearer" as const,
    expires_in: ACCESS_SECONDS,
    refresh_token: await signFor(REFRESH, ownerId, REFRESH_SECONDS, { cid: clientId }),
    scope: SCOPE,
  }
}

type CodeExchange = { code?: string; verifier?: string; clientId?: string; redirectUri?: string }

export async function exchangeCode({ code, verifier, clientId, redirectUri }: CodeExchange) {
  const claims = await readFor(CODE, code)
  const bad = new OAuthError("invalid_grant", "That code isn't valid, or it has run out. Start the connection again")
  if (!claims?.sub || !verifier || claims.cid !== clientId || claims.ru !== redirectUri) throw bad
  if (typeof claims.cc !== "string" || !proves(verifier, claims.cc)) throw bad
  return tokensFor(claims.sub, claims.cid as string)
}

export async function refreshTokens({ refreshToken, clientId }: { refreshToken?: string; clientId?: string }) {
  const claims = await readFor(REFRESH, refreshToken)
  if (!claims?.sub || claims.cid !== clientId) throw new OAuthError("invalid_grant", "That refresh token isn't valid, or it has run out")
  return tokensFor(claims.sub, claims.cid as string)
}

// Who an agent's access token is for
export async function readAccessToken(token: string) {
  return (await readFor(ACCESS, token))?.sub
}
