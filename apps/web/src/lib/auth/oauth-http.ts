import { NextResponse } from "next/server"

import { SCOPE } from "./oauth"
import { appOrigin } from "./request"

// Read by programs, from any site: where an agent finds out how to connect. The endpoints it names are the API's.
const OPEN = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
}

export const preflight = () => new NextResponse(null, { status: 204, headers: OPEN })
export const open = (body: unknown) => NextResponse.json(body, { headers: OPEN })

// What an agent reads to find out where to send a person and where to swap what they allowed for a token
export const authorizationServerMetadata = (request: Request) => {
  const origin = appOrigin(request)
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
  }
}
