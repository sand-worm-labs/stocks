// The SDK is resolved through its `exports` map, which this lint rule can't read; tsc resolves it
// eslint-disable-next-line import/no-unresolved
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"

import { agentOwner } from "@/lib/mcp/auth"
import { createStocksMcpServer } from "@/lib/mcp/server"
import { getStrategyService } from "@/lib/strategies/source"

export const dynamic = "force-dynamic"

const refuse = (status: number, error: string) => Response.json({ error }, { status })

// The MCP endpoint for agents from outside, such as Claude. Each request is answered on its own (no session is kept), as the agent
// token's person. It is not part of the app's own API: no cookie, no same-origin check, its own token.
export async function POST(request: Request) {
  const ownerId = agentOwner(request)
  if (!ownerId) return refuse(401, "Unauthorized")

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await createStocksMcpServer(getStrategyService(), ownerId).connect(transport)
  return transport.handleRequest(request)
}

export const GET = () => refuse(405, "Use POST")
export const DELETE = () => refuse(405, "Use POST")
