import { verifyDynamicToken } from "./dynamic"
import { AUTH_PROVIDERS, type AuthProviderId } from "./providers"

export class ProviderUnavailableError extends Error {}

// Proves who a person is from what a provider handed the browser, and returns their id. This is the one place that differs between
// ways of signing in. To switch Sandworm on: check the token the main app issues here (as `verifyDynamicToken` does for a wallet),
// return the account id from it, and set `available` for it in `AUTH_PROVIDERS`.
export async function identify(provider: AuthProviderId, token: string) {
  if (!AUTH_PROVIDERS[provider].available) throw new ProviderUnavailableError("This way of signing in isn't open yet")

  switch (provider) {
    case "wallet": {
      const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
      if (!environmentId) throw new ProviderUnavailableError("Sign-in isn't set up")
      return verifyDynamicToken(token, environmentId)
    }
    case "sandworm":
      throw new ProviderUnavailableError("Sign in with Sandworm isn't connected yet")
  }
}
