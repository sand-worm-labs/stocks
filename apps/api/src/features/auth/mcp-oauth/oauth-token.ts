import { exchangeCode, OAuthError, refreshTokens } from "./oauth"

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
