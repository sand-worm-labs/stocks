import { registerClient } from "@/lib/auth/oauth"
import { answering, preflight } from "@/lib/auth/oauth-http"

// An agent says what it is and where to send the person back to, and is given an id for itself
export const POST = (request: Request) => answering(async () => registerClient(await request.json().catch(() => ({}))), 201)
export const OPTIONS = preflight
