import { createServer as createHttpServer } from "node:http"

import { createHandler } from "./http"

const PORT = Number(process.env.PORT ?? 4100)
const WEB_URL = process.env.STOCKS_WEB_URL ?? "http://localhost:3000"

createHttpServer(
  createHandler({
    publicUrl: (process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, ""),
    webUrl: WEB_URL,
    // Where a person's browser reaches the app, which can differ from where this server does (inside one network, say)
    webPublicUrl: (process.env.STOCKS_WEB_PUBLIC_URL ?? WEB_URL).replace(/\/$/, ""),
  })
).listen(PORT, () => console.log(`Stocks MCP on :${PORT}, calling ${WEB_URL}`))
