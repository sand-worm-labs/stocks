// The ways to sign in. Each ends the same way, in our own session for whoever it proved (see `identify`), so a new one is added
// here, in `identify`, and as a button on the sign-in page, and nothing else changes: the pages, the first run and the sign-out
// all work from the session.

export type AuthProviderId = "sandworm" | "wallet"

export const AUTH_PROVIDERS: Record<AuthProviderId, { label: string; available: boolean }> = {
  // The main Sandworm app. Not connected yet: its button is shown and says so, and goes nowhere.
  sandworm: { label: "Continue with Sandworm", available: false },
  // A wallet, or an email, through Dynamic
  wallet: { label: "Connect a wallet", available: true },
}

export const isProviderId = (value: unknown): value is AuthProviderId => value === "sandworm" || value === "wallet"
