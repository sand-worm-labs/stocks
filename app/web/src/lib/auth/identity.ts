import { type DynamicIdentity, verifyDynamicToken } from "./dynamic"
import { type SandwormLogin, sandwormLogin } from "./sandworm"

export class ProviderUnavailableError extends Error {}

// Proves who a person is from what Dynamic handed the browser (a wallet, or an email that comes with one), and returns their account's
// id and the wallets Dynamic has verified for them. The token is checked against Dynamic's public keys; nothing the browser adds is
// believed. The id is their Sandworm account's, made on the way in if they are new; with no main app to ask, it is Dynamic's own.
export async function identify(token: string): Promise<DynamicIdentity & { sandworm?: SandwormLogin }> {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
  if (!environmentId) throw new ProviderUnavailableError("Sign-in isn't set up")

  const dynamic = await verifyDynamicToken(token, environmentId)
  const login = await sandwormLogin(token)
  return { id: login?.id ?? dynamic.id, wallets: dynamic.wallets, ...(login?.login.access && { sandworm: login.login }) }
}
