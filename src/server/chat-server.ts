import { WebSocket, WebSocketServer } from "ws"
import { randomUUID } from "node:crypto"

import { readChatTicket } from "@/lib/auth/token"
import { type ChatMessage, cleanText, isRoom, nameOf, sayMessage, type ServerEvent } from "@/lib/chat/protocol"

// How many messages a room remembers for whoever comes in next, and the least time between one person's messages
const KEPT = 100
const GAP_MS = 700

// Whatever arrives from a browser is not trusted: text that isn't JSON is nothing, and doesn't stop the server
const parse = (data: unknown): unknown => {
  try {
    return JSON.parse(String(data))
  } catch {
    return undefined
  }
}

const send = (socket: WebSocket, event: ServerEvent) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event))
}

// A room for each token, kept only while the server runs. Whoever opens the connection has to bring a ticket from the app, which says
// who they are; what they write is passed to everyone in the room, and the room remembers the last few for those who come later.
export function createChat() {
  const server = new WebSocketServer({ noServer: true, maxPayload: 2048 })
  const rooms = new Map<string, Set<WebSocket>>()
  const history = new Map<string, ChatMessage[]>()
  const who = new WeakMap<WebSocket, string>()

  // People, not tabs: someone with the page open twice is one in the room
  const online = (room: string) => new Set([...(rooms.get(room) ?? [])].map((socket) => who.get(socket))).size
  const tell = (room: string, event: ServerEvent) => rooms.get(room)?.forEach((socket) => send(socket, event))

  server.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "/", "http://chat")
    const room = url.searchParams.get("room")
    if (!isRoom(room)) return socket.close(4400, "That isn't a room")

    const userId = await readChatTicket(url.searchParams.get("ticket"))
    if (!userId) return socket.close(4401, "Sign in again")
    // Gone while the ticket was being checked
    if (socket.readyState !== WebSocket.OPEN) return

    who.set(socket, userId)
    rooms.set(room, (rooms.get(room) ?? new Set()).add(socket))
    send(socket, {
      type: "hello",
      me: { id: userId, name: nameOf(userId) },
      history: history.get(room) ?? [],
      online: online(room),
    })
    tell(room, { type: "online", count: online(room) })

    let last = 0
    socket.on("message", (data) => {
      const said = sayMessage.safeParse(parse(data))
      const text = said.success ? cleanText(said.data.text) : undefined
      if (!text) return

      if (Date.now() - last < GAP_MS) return send(socket, { type: "error", reason: "You're sending messages too fast" })
      last = Date.now()

      const message: ChatMessage = { id: randomUUID(), at: Date.now(), userId, name: nameOf(userId), text }
      history.set(room, [...(history.get(room) ?? []), message].slice(-KEPT))
      tell(room, { type: "message", message })
    })
    socket.on("close", () => {
      rooms.get(room)?.delete(socket)
      if (!rooms.get(room)?.size) rooms.delete(room)
      else tell(room, { type: "online", count: online(room) })
    })
  })

  return server
}
