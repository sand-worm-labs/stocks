import { answering, preflight, tokenFor } from "@/lib/auth/oauth-http"

// What an agent swaps the code it was given, or a refresh token, for a token of its own
export const POST = (request: Request) => answering(async () => tokenFor(new URLSearchParams(await request.text())))
export const OPTIONS = preflight
