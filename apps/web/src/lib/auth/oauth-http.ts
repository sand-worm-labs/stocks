import { NextResponse } from "next/server"

import { exchangeCode, OAuthError, refreshTokens, SCOPE } from "./oauth"
import { appOrigin } from "./request"

// The sign-in for agents is called by programs, not by a person's browser on our pages, so its endpoints have no cookie to read and no page to
// have come from: they answer to the standard's own checks (a signed client, a code, a proof key). Anyone may call them, from any site.
const OPEN = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
}

export const preflight = () => new NextResponse(null, { status: 204, headers: OPEN })
export const open = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: OPEN })

// Runs one endpoint's work and says what went wrong the way the standard has it: a code and a sentence
export async function answering(run: () => Promise<unknown>, status = 200) {
  try {
    return open(await run(), status)
  } catch (error) {
    if (error instanceof OAuthError) return open({ error: error.code, error_description: error.message }, 400)
    console.error(error)
    return open({ error: "server_error", error_description: "Something went wrong on our side" }, 500)
  }
}

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

// The token endpoint: a code swapped for a token, or a refresh token for a fresh one. The agent is a public client with no secret of its own;
// what proves it is the key it made up when it started, which only it has.
export async function tokenFor(form: URLSearchParams) {
  const grant = form.get("grant_type")
  if (grant === "authorization_code")
    return exchangeCode({
      code: form.get("code") ?? undefined,
      verifier: form.get("code_verifier") ?? undefined,
      clientId: form.get("client_id") ?? undefined,
      redirectUri: form.get("redirect_uri") ?? undefined,
    })
  if (grant === "refresh_token")
    return refreshTokens({ refreshToken: form.get("refresh_token") ?? undefined, clientId: form.get("client_id") ?? undefined })
  throw new OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token")
}
