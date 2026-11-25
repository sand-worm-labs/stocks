import type { WebSocketServer } from "ws"
import { createServer } from "node:http"

import { BEAT_MS, MARKET_PATH } from "@/constants/realtime"

import { createChat } from "./chat-server"
import { createMarket } from "./market-server"

export function createRealtimeServer(port: number, market: WebSocketServer = createMarket()) {
  const chat = createChat()
  const alive = new WeakSet<object>()

  const server = createServer((_, response) => response.writeHead(200).end("ok"))

  server.on("upgrade", (request, socket, head) => {
    const target = new URL(request.url ?? "/", "http://realtime").pathname === MARKET_PATH ? market : chat
    target.handleUpgrade(request, socket, head, (connection) => target.emit("connection", connection, request))
  })

  for (const wss of [chat, market]) {
    wss.on("connection", (socket) => {
      alive.add(socket)
      socket.on("pong", () => alive.add(socket))
    })
  }

  const beat = setInterval(() => {
    for (const wss of [chat, market])
      wss.clients.forEach((socket) => {
        if (!alive.has(socket)) return socket.terminate()
        alive.delete(socket)
        socket.ping()
      })
  }, BEAT_MS)

  server.on("close", () => {
    clearInterval(beat)
    chat.close()
    market.close()
  })

  return server.listen(port)
}
