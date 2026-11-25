export const SESSION_COOKIE = "sw_session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export const SIGN_IN_PATH = "/signin"
export const DEFAULT_AFTER_SIGN_IN = "/strategies"

// Every page needs a signed-in account except the sign-in page itself, so there is no list of protected pages to keep up to date.
// Signing in is required unless AUTH_REQUIRED is set to "false", for working on the app without a wallet.
export const authRequired = () => process.env.AUTH_REQUIRED !== "false"

// The one person there is when sign-in is switched off. A real account id has this shape (a uuid), which is what the database keeps
// strategies under, so working locally goes through the same code as everyone else.
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000000"

// The person's own access token on Sandworm, sealed, so research can be done there as them. It lasts as long as Sandworm says it does.
export const SANDWORM_COOKIE = "sw_sandworm"
