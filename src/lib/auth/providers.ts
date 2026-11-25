export type AuthProviderId = "sandworm" | "wallet"

export const AUTH_PROVIDERS: Record<AuthProviderId, { label: string; available: boolean }> = {
  sandworm: { label: "Continue with Sandworm", available: false },
  wallet: { label: "Connect a wallet", available: true },
}
