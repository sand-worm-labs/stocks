import { respond } from "@/lib/api/respond"
import { signChatTicket } from "@/lib/auth/token"
import { realtimeUrl } from "@/lib/realtime/url"

export async function GET(request: Request) {
  return respond(request, {}, async ({ ownerId }) => ({
    ticket: await signChatTicket(ownerId),
    url: realtimeUrl(),
  }))
}
