"use client"

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"
import { DynamicContextProvider, getMinAuthToken } from "@dynamic-labs/sdk-react-core"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { APP_CHAINS } from "@/constants/chains"
import { ONBOARDING_PATH } from "@/constants/onboarding"
import { DEFAULT_AFTER_SIGN_IN, SIGN_IN_PATH } from "@/lib/auth/config"
import { env } from "env.mjs"

import { WalletEnabled } from "./WalletContext"

// The networks the app works on, in the order they are offered: Base Sepolia, where paper trading's USDC is free, then
// Base. Whatever else the dashboard has switched on, Ethereum included, isn't offered, unless none of these is on at all.
const APP_CHAIN_IDS: number[] = APP_CHAINS.map(({ id }) => id)

const onlyAppNetworks = <N extends { chainId: number | string }>(networks: N[]) => {
  const kept = networks
    .filter(({ chainId }) => APP_CHAIN_IDS.includes(Number(chainId)))
    .sort((a, b) => APP_CHAIN_IDS.indexOf(Number(a.chainId)) - APP_CHAIN_IDS.indexOf(Number(b.chainId)))
  return kept.length ? kept : networks
}

// A path on this site, or nowhere: a sign-in link can't be made to send people to another site
const safeNext = (next: string | null) => (next?.startsWith("/") && !next.startsWith("//") ? next : undefined)

// Dynamic, which does the signing in and the wallets: email, social, or a wallet from the browser or the phone. When a
// person signs in there, it hands our server the access token it gave them, and our server turns it into a session.
export function DynamicProviders({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID

  if (!environmentId) return <WalletEnabled value={false}>{children}</WalletEnabled>

  const startSession = async () => {
    const token = getMinAuthToken()
    if (!token) return

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!response.ok) {
      toast.error("We couldn't sign you in", { description: "Try again in a moment." })
      return
    }

    // On the sign-in page, on to where they were going, or for someone new, to the first run. Anywhere else, the page now
    // knows who is here.
    if (window.location.pathname === SIGN_IN_PATH) {
      const { onboarded } = (await response.json()) as { onboarded: boolean }
      const next = safeNext(new URLSearchParams(window.location.search).get("next"))
      router.replace(onboarded ? (next ?? DEFAULT_AFTER_SIGN_IN) : ONBOARDING_PATH)
    }
    router.refresh()
  }

  const endSession = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    router.refresh()
  }

  return (
    <WalletEnabled value>
      <DynamicContextProvider
        theme={resolvedTheme === "dark" || resolvedTheme === "light" ? resolvedTheme : "auto"}
        settings={{
          environmentId,
          appName: "Sandworm Stocks",
          appLogoUrl: "/logo.svg",
          walletConnectors: [EthereumWalletConnectors],
          // A wallet on another network is asked to switch to one of ours when it signs in
          networkValidationMode: "always",
          overrides: { evmNetworks: onlyAppNetworks },
          events: { onAuthSuccess: startSession, onLogout: endSession },
        }}
      >
        {children}
      </DynamicContextProvider>
    </WalletEnabled>
  )
}
