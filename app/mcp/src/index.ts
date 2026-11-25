import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http"

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"

import { createServer } from "./server"
import { createWeb } from "./web"

const PORT = Number(process.env.PORT ?? 4100)
const WEB_URL = process.env.STOCKS_WEB_URL ?? "http://localhost:3000"
const MAX_BODY = 1_000_000

const send = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body))
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

// One request, answered on its own (no session is kept), as whoever the token is for. The token goes on to the app, which is what knows who
// that is and refuses a wrong one, so a request without one is the only thing refused here.
async function handleMcp(request: IncomingMessage, response: ServerResponse) {
  const token = request.headers.authorization?.replace(/^Bearer /i, "")
  if (!token) return send(response, 401, { error: "Unauthorized" })

  const body = await readJson(request).catch(() => undefined)
  if (body === undefined) return send(response, 400, { error: "Send a JSON-RPC message" })

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  response.on("close", () => void transport.close())
  await createServer(createWeb(WEB_URL, token)).connect(transport)
  await transport.handleRequest(request, response, body)
}

createHttpServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost")
  if (pathname === "/health") return send(response, 200, { ok: true })
  if (pathname !== "/mcp") return send(response, 404, { error: "Not found" })
  if (request.method !== "POST") return send(response, 405, { error: "Use POST" })

  handleMcp(request, response).catch((error) => {
    console.error(error)
    if (!response.headersSent) send(response, 500, { error: "Something went wrong on our side" })
  })
}).listen(PORT, () => console.log(`Stocks MCP on :${PORT}, calling ${WEB_URL}`))
