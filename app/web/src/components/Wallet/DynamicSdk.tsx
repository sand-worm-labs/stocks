"use client"

import { EthereumWalletConnectors, isEthereumWallet } from "@dynamic-labs/ethereum"
import {
  DynamicContextProvider,
  DynamicUserProfile,
  getMinAuthToken,
  useDynamicContext,
  useDynamicModals,
} from "@dynamic-labs/sdk-react-core"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { APP_CHAIN_IDS } from "@/constants/components/wallet/dynamic-sdk"
import { ONBOARDING_PATH } from "@/constants/onboarding"
import { DEFAULT_AFTER_SIGN_IN, SIGN_IN_PATH } from "@/lib/auth/config"
import { env } from "env.mjs"

import type { ApproveWith, Published } from "./WalletContext"

// The one file that imports Dynamic's SDK, which is large. It is fetched when a wallet is wanted (see DynamicProviders),
// so a page doesn't carry it to be shown.

const onlyAppNetworks = <N extends { chainId: number | string }>(networks: N[]) => {
  const kept = networks
    .filter(({ chainId }) => APP_CHAIN_IDS.includes(Number(chainId)))
    .sort((a, b) => APP_CHAIN_IDS.indexOf(Number(a.chainId)) - APP_CHAIN_IDS.indexOf(Number(b.chainId)))
  return kept.length ? kept : networks
}

// A path on this site, or nowhere: a sign-in link can't be made to send people to another site
const safeNext = (next: string | null) => (next?.startsWith("/") && !next.startsWith("//") ? next : undefined)

type Publish = (value: Published | undefined) => void

// The connected wallet, if it is one that can pay on Base. Anything else is told so in words, not with an error from the SDK.
function ethereumWallet(wallet: ReturnType<typeof useDynamicContext>["primaryWallet"]) {
  if (!wallet || !isEthereumWallet(wallet)) throw new Error("Connect a wallet that works on Base first")
  return wallet
}

function Bridge({ publish, resume, signingIn }: { publish: Publish; resume: () => void; signingIn: boolean }) {
  const { user, primaryWallet, network, showAuthFlow, setShowAuthFlow, setShowDynamicUserProfile, handleLogOut } =
    useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()

  // The actions are reached through a ref, so that they are always the latest and a change to one isn't a reason to
  // tell the app again
  const actions = useRef({ setShowAuthFlow, setShowDynamicUserProfile, setShowLinkNewWalletModal, handleLogOut })

  // What approving uses, reached through a ref so it is always the wallet as it is now
  const wallet = useRef(primaryWallet)
  useLayoutEffect(() => {
    actions.current = { setShowAuthFlow, setShowDynamicUserProfile, setShowLinkNewWalletModal, handleLogOut }
    wallet.current = primaryWallet
  })
  const approve = useRef<ApproveWith>({
    switchChain: async (chainId) => {
      const current = ethereumWallet(wallet.current)
      if (Number(await current.getNetwork()) !== chainId) await current.switchNetwork(chainId)
    },
    sign: async (message) => {
      const current = ethereumWallet(wallet.current)
      const client = await current.getWalletClient()
      const address = current.address as `0x${string}`
      return { address, signature: await client.signMessage({ account: address, message }) }
    },
  })

  const isSignedIn = Boolean(user)
  const address = primaryWallet?.address
  const connecting = signingIn || showAuthFlow

  useEffect(() => {
    publish({
      approve: approve.current,
      isSignedIn,
      connecting,
      address,
      network,
      openSignIn: () => actions.current.setShowAuthFlow(true),
      linkWallet: () => actions.current.setShowLinkNewWalletModal(true),
      openProfile: () => actions.current.setShowDynamicUserProfile(true),
      signOut: async () => {
        await actions.current.handleLogOut()
      },
    })
  }, [publish, isSignedIn, connecting, address, network])

  useEffect(() => () => publish(undefined), [publish])

  const resumed = useRef(false)
  useEffect(() => {
    if (!isSignedIn || resumed.current || window.location.pathname !== SIGN_IN_PATH) return
    resumed.current = true
    resume()
  }, [isSignedIn, resume])

  return isSignedIn ? <DynamicUserProfile /> : null
}

export function DynamicSdk({ publish }: { publish: Publish }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
  const starting = useRef(false)
  const [signingIn, setSigningIn] = useState(false)

  if (!environmentId) return null

  const startSession = async () => {
    const token = getMinAuthToken()
    if (!token || starting.current) return
    starting.current = true
    setSigningIn(true)

    try {
      const leaving = await makeSession(token).catch(() => false)
      if (!leaving) setSigningIn(false)
    } finally {
      starting.current = false
    }
  }

  const makeSession = async (token: string) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string }
      toast.error("We couldn't sign you in", { description: error ?? "Try again in a moment." })
      return false
    }

    if (window.location.pathname === SIGN_IN_PATH) {
      const { onboarded } = (await response.json()) as { onboarded: boolean }
      const next = safeNext(new URLSearchParams(window.location.search).get("next"))
      router.replace(onboarded ? (next ?? DEFAULT_AFTER_SIGN_IN) : ONBOARDING_PATH)
      router.refresh()
      return true
    }
    router.refresh()
    return false
  }

  const endSession = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    router.refresh()
  }

  return (
    <DynamicContextProvider
      theme={resolvedTheme === "dark" || resolvedTheme === "light" ? resolvedTheme : "auto"}
      settings={{
        environmentId,
        appName: "Sandworm Stocks",
        appLogoUrl: "/logo.svg",
        walletConnectors: [EthereumWalletConnectors],
        networkValidationMode: "always",
        overrides: { evmNetworks: onlyAppNetworks },
        events: { onAuthSuccess: startSession, onLogout: endSession },
      }}
    >
      <Bridge publish={publish} resume={startSession} signingIn={signingIn} />
    </DynamicContextProvider>
  )
}
