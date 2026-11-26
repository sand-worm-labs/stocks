import { authorizationServerMetadata, open, preflight } from "@/lib/auth/oauth-http"

// Where an agent finds out how to connect: the places to send a person and to swap what they allowed for a token
export const GET = (request: Request) => open(authorizationServerMetadata(request))
export const OPTIONS = preflight
