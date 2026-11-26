import type { IncomingMessage, ServerResponse } from "node:http"

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"

import { createServer } from "./server"
import { createApi, ApiError } from "./api"

const MAX_BODY = 1_000_000
const SCOPE = "stocks"

export type HttpConfig = {
  // Where this server is reached from outside, with no trailing slash
  publicUrl: string
  // Where the Sandworm Stocks API is, for this server to call
  apiUrl: string
  // Where a person's browser reaches the web app, which is the sign-in
  webPublicUrl: string
  fetchImpl?: typeof fetch
}

const send = (response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  response.writeHead(status, { "Content-Type": "application/json", ...headers }).end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new Error("Too large")
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

// How a client of this server finds out where to sign in (RFC 9728): the app is the authorization server, so a person signs in there, in the
// same window they know, and the agent is given a token of its own
const protectedResource = ({ publicUrl, webPublicUrl }: HttpConfig) => ({
  resource: `${publicUrl}/mcp`,
  authorization_servers: [webPublicUrl],
  bearer_methods_supported: ["header"],
  scopes_supported: [SCOPE],
})

// The standard answer to a request that isn't signed in: 401, and where to read how to sign in
const unauthorized = (response: ServerResponse, config: HttpConfig, reason: string) =>
  send(response, 401, { error: reason }, { "WWW-Authenticate": `Bearer resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource"` })

// One request, answered on its own (no session is kept), as whoever the token is for. The app is what knows who that is, so the token is
// checked there first: one that is missing, wrong or has run out is answered with the standard 401, and the agent signs in again or refreshes.
async function handleMcp(request: IncomingMessage, response: ServerResponse, config: HttpConfig) {
  const token = request.headers.authorization?.replace(/^Bearer /i, "")
  if (!token) return unauthorized(response, config, "Sign in to Sandworm Stocks")

  const api = createApi(config.apiUrl, token, config.fetchImpl)
  try {
    await api.get("/oauth/whoami")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return unauthorized(response, config, "That sign-in isn't valid any more")
    return send(response, 502, { error: "The Sandworm Stocks app could not be reached" })
  }

  const body = await readJson(request).catch(() => undefined)
  if (body === undefined) return send(response, 400, { error: "Send a JSON-RPC message" })

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  response.on("close", () => void transport.close())
  await createServer(api).connect(transport)
  await transport.handleRequest(request, response, body)
}

export function createHandler(config: HttpConfig) {
  return (request: IncomingMessage, response: ServerResponse) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost")

    if (pathname === "/health") return send(response, 200, { ok: true })
    if (pathname.startsWith("/.well-known/oauth-protected-resource")) return send(response, 200, protectedResource(config), { "Access-Control-Allow-Origin": "*" })
    if (pathname !== "/mcp") return send(response, 404, { error: "Not found" })
    if (request.method !== "POST") return send(response, 405, { error: "Use POST" })

    handleMcp(request, response, config).catch((error) => {
      console.error(error)
      if (!response.headersSent) send(response, 500, { error: "Something went wrong on our side" })
    })
  }
}
