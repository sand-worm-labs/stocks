import { createServer as createHttpServer } from "node:http"

import { createHandler } from "./http"

const PORT = Number(process.env.PORT ?? 4100)
const API_URL = process.env.STOCKS_API_URL ?? "http://localhost:4000"
const WEB_PUBLIC_URL = process.env.STOCKS_WEB_PUBLIC_URL ?? "http://localhost:3001"

createHttpServer(
  createHandler({
    publicUrl: (process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, ""),
    apiUrl: API_URL,
    // Where a person's browser reaches the web app, which is where they sign in and allow an agent
    webPublicUrl: WEB_PUBLIC_URL.replace(/\/$/, ""),
  })
).listen(PORT, () => console.log(`Stocks MCP on :${PORT}, calling ${API_URL}`))
