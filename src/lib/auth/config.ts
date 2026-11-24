export const SESSION_COOKIE = "sw_session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

// Where a person goes to sign in, and where they go after if nothing sent them anywhere
export const SIGN_IN_PATH = "/signin"
export const DEFAULT_AFTER_SIGN_IN = "/strategies"

// Every page needs a signed-in account except the sign-in page itself, so there is no list of protected pages to keep up to date.
// Signing in is required unless AUTH_REQUIRED is set to "false", for working on the app without a wallet.
export const authRequired = () => process.env.AUTH_REQUIRED !== "false"
