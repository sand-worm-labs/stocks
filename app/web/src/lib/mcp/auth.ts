import { timingSafeEqual } from "node:crypto"

// Who an agent calling the Stocks MCP acts for. For now one fixed agent token is mapped to one person (set in the environment), which is
// enough to try an agent on your own strategies. Letting anyone connect their own agent needs a token per person, made when they
// connect (the way Sandworm's own MCP does it with OAuth): this is the one place to change for that.
export function agentOwner(request: Request): string | undefined {
  const token = process.env.STOCKS_AGENT_TOKEN
  const ownerId = process.env.STOCKS_AGENT_OWNER_ID
  if (!token || !ownerId) return undefined

  const given = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? ""
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b) ? ownerId : undefined
}
