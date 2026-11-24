import { respond } from "@/lib/api/respond"
import { signChatTicket } from "@/lib/auth/token"

// Where the chat server is: set CHAT_WS_URL for the one running next to the deployed app. While developing it is on this machine.
const chatUrl = () =>
  process.env.CHAT_WS_URL ?? (process.env.NODE_ENV === "production" ? undefined : "ws://localhost:3002")

// What a signed-in browser needs to open the chat: a minute's pass, and where to open it
export const GET = (request: Request) =>
  respond(request, undefined, async (ownerId) => ({ ticket: await signChatTicket(ownerId), url: chatUrl() }))
