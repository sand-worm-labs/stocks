import { createRemoteJWKSet, jwtVerify } from "jose"

const API = "https://app.dynamicauth.com/api/v0/sdk"

// Dynamic's public keys for an environment, fetched once and kept by jose, which refetches when a key it doesn't know turns up
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

const keysFor = (environmentId: string) => {
  const existing = keySets.get(environmentId)
  if (existing) return existing
  const created = createRemoteJWKSet(new URL(`${API}/${environmentId}/.well-known/jwks`))
  keySets.set(environmentId, created)
  return created
}

export class DynamicTokenError extends Error {}

export async function verifyDynamicToken(token: string, environmentId: string) {
  try {
    const { payload } = await jwtVerify(token, keysFor(environmentId), {
      issuer: `app.dynamicauth.com/${environmentId}`,
      algorithms: ["RS256"],
    })
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : []
    if (!scopes.includes("user:basic") || !payload.sub) throw new DynamicTokenError("Sign-in isn't finished")
    return payload.sub
  } catch (error) {
    throw error instanceof DynamicTokenError ? error : new DynamicTokenError("This sign-in couldn't be checked")
  }
}
