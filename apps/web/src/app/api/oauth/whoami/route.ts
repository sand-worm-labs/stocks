import { respond } from "@/lib/api/respond"

// Whether the token (or session) the request brings is good. The Stocks MCP asks this before it answers an agent, so a token that has run out is
// answered with the standard "sign in again" and the agent refreshes it, instead of failing in the middle of a tool.
export async function GET(request: Request) {
  return respond(request, {}, async () => ({ ok: true }))
}
