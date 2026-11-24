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
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { APP_CHAINS } from "@/constants/chains"
import { ONBOARDING_PATH } from "@/constants/onboarding"
import { DEFAULT_AFTER_SIGN_IN, SIGN_IN_PATH } from "@/lib/auth/config"
import { env } from "env.mjs"

import type { ApproveWith, Published } from "./WalletContext"

// The one file that imports Dynamic's SDK, which is large. It is fetched when a wallet is wanted (see DynamicProviders),
// so a page doesn't carry it to be shown.

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

type Publish = (value: Published | undefined) => void

// The connected wallet, if it is one that can pay on Base. Anything else is told so in words, not with an error from the SDK.
function ethereumWallet(wallet: ReturnType<typeof useDynamicContext>["primaryWallet"]) {
  if (!wallet || !isEthereumWallet(wallet)) throw new Error("Connect a wallet that works on Base first")
  return wallet
}

// Inside Dynamic, tells the rest of the app what it says. The app reads plain values, not Dynamic's hooks.
function Bridge({ publish, resume, signingIn }: { publish: Publish; resume: () => void; signingIn: boolean }) {
  const { user, primaryWallet, network, showAuthFlow, setShowAuthFlow, setShowDynamicUserProfile, handleLogOut } =
    useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()

  // The actions are reached through a ref, so that they are always the latest and a change to one isn't a reason to
  // tell the app again
  const actions = useRef({ setShowAuthFlow, setShowDynamicUserProfile, setShowLinkNewWalletModal, handleLogOut })
  actions.current = { setShowAuthFlow, setShowDynamicUserProfile, setShowLinkNewWalletModal, handleLogOut }

  // What approving uses, reached through a ref so it is always the wallet as it is now
  const wallet = useRef(primaryWallet)
  wallet.current = primaryWallet
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

  // Sent to sign in while Dynamic still has them signed in (our cookie ended, theirs didn't): there is no sign-in left to do, so the
  // session is made again from it, rather than leaving them on a page whose button does nothing
  const resumed = useRef(false)
  useEffect(() => {
    if (!isSignedIn || resumed.current || window.location.pathname !== SIGN_IN_PATH) return
    resumed.current = true
    resume()
  }, [isSignedIn, resume])

  // The panel of what a signed-in person holds and has done
  return isSignedIn ? <DynamicUserProfile /> : null
}

// Dynamic, which does the signing in and the wallets: email, social, or a wallet from the browser or the phone. When a
// person signs in there, it hands our server the access token it gave them, and our server turns it into a session.
export function DynamicSdk({ publish }: { publish: Publish }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
  // A sign-in can be reported twice (when it happens, and when the sign-in page finds it already there); once is enough
  const starting = useRef(false)
  // From Dynamic saying someone has signed in until the page has changed, or it has failed: the wallet button shows it
  const [signingIn, setSigningIn] = useState(false)

  if (!environmentId) return null

  const startSession = async () => {
    const token = getMinAuthToken()
    if (!token || starting.current) return
    starting.current = true
    setSigningIn(true)

    try {
      // Once the page is on its way somewhere else the button stays busy, so a second click can't start a second sign-in
      const leaving = await makeSession(token).catch(() => false)
      if (!leaving) setSigningIn(false)
    } finally {
      starting.current = false
    }
  }

  // Makes the session; true when the sign-in page is being left for another page
  const makeSession = async (token: string) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "wallet", token }),
    })
    if (!response.ok) {
      toast.error("We couldn't sign you in", { description: "Try again in a moment." })
      return false
    }

    // On the sign-in page, on to where they were going, or for someone new, to the first run. Anywhere else, the page now
    // knows who is here.
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
        // A wallet on another network is asked to switch to one of ours when it signs in
        networkValidationMode: "always",
        overrides: { evmNetworks: onlyAppNetworks },
        events: { onAuthSuccess: startSession, onLogout: endSession },
      }}
    >
      <Bridge publish={publish} resume={startSession} signingIn={signingIn} />
    </DynamicContextProvider>
  )
}
