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

// Checks a token Dynamic issued to a person and returns their Dynamic user id. It has to be signed with this
// environment's key (RS256), be for this environment, not be expired, and carry the scope of a fully signed-in user.
export async function verifyDynamicToken(token: string, environmentId: string) {
  try {
    const { payload } = await jwtVerify(token, keysFor(environmentId), {
      issuer: `app.dynamicauth.com/${environmentId}`,
      algorithms: ["RS256"],
    })
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : []
    // A person who still has to finish a step, like a second factor, isn't signed in yet
    if (!scopes.includes("user:basic") || !payload.sub) throw new DynamicTokenError("Sign-in isn't finished")
    return payload.sub
  } catch (error) {
    throw error instanceof DynamicTokenError ? error : new DynamicTokenError("This sign-in couldn't be checked")
  }
}
