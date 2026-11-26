import { timingSafeEqual } from "node:crypto"
import type { IncomingHttpHeaders } from "node:http"

import { readAccessToken } from "./oauth"
import { settings } from "@/config/settings"

// Who an agent acts for when it calls the API with a token instead of a person's cookie (the Stocks MCP does, and passes the token on).
// The token is one the person gave the agent when they connected it (lib/auth/oauth.ts), or the fixed one set in the environment.
export async function agentOwner(headers: IncomingHttpHeaders): Promise<string | undefined> {
  const given = headers.authorization?.replace(/^Bearer /i, "") ?? ""
  if (!given) return undefined

  // An agent the person connected themselves, with a token of its own for them
  const connected = await readAccessToken(given)
  if (connected) return connected

  // The one fixed token set in the environment, for trying an agent on your own strategies
  const { token, ownerId } = settings().agent
  if (!token || !ownerId) return undefined

  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b) ? ownerId : undefined
}

// A request that brings a bearer token is an agent's, and is held to the agent's rules (the token must be right) rather than a person's
export const hasAgentToken = (headers: IncomingHttpHeaders) => /^Bearer /i.test(headers.authorization ?? "")
