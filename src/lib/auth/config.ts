export const SESSION_COOKIE = "sw_session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

// Where a person goes to sign in, and where they go after if nothing sent them anywhere
export const SIGN_IN_PATH = "/signin"
export const DEFAULT_AFTER_SIGN_IN = "/portfolios"

// Pages that need a signed-in account. Markets are open to read without one.
export const PROTECTED_PATHS = ["/portfolios", "/activity", "/settings"]
