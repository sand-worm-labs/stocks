import { respond } from "@/lib/api/respond"
import { signChatTicket } from "@/lib/auth/token"
import { realtimeUrl } from "@/lib/realtime/url"

export const GET = (request: Request) =>
  respond(request, undefined, async (ownerId) => ({ ticket: await signChatTicket(ownerId), url: realtimeUrl() }))
