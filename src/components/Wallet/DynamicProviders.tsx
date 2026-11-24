"use client"

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { env } from "env.mjs"

import { type PreloadWhen, type Published, type Wallet, WalletProvider } from "./WalletContext"

type Intent = "signIn" | "linkWallet" | "profile"
type SdkProps = { publish: (value: Published | undefined) => void }

const IDLE_TIMEOUT_MS = 3000
// For a browser without requestIdleCallback
const IDLE_FALLBACK_MS = 1500

const noWallet = async () => Promise.reject(new Error("Connect your wallet first"))

const perform = (wallet: Published, intent: Intent) =>
  ({ signIn: wallet.openSignIn, linkWallet: wallet.linkWallet, profile: wallet.openProfile })[intent]()

// Wallets are Dynamic's, and its SDK is large, so it isn't part of the page. It is fetched (see `useWallet`) when a page
// is about wallets, when someone signed in is likely to want theirs shown, or when someone reaches for the button that
// opens it. What it says is read through plain values, so the rest of the app never imports it, and a click that comes
// before it has arrived is kept and carried out when it does.
export function DynamicProviders({ children }: { children: ReactNode }) {
  const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
  const [Sdk, setSdk] = useState<ComponentType<SdkProps>>()
  const [live, setLive] = useState<Published>()
  const [isRequested, setIsRequested] = useState(false)
  const requested = useRef(false)
  const pending = useRef<Intent>(undefined)
  const liveRef = useRef(live)
  liveRef.current = live

  const load = useCallback(() => {
    if (!environmentId || requested.current) return

    requested.current = true
    setIsRequested(true)
    import("./DynamicSdk")
      .then(({ DynamicSdk }) => setSdk(() => DynamicSdk))
      .catch(() => {
        // Asked for again the next time it is wanted
        requested.current = false
        setIsRequested(false)
      })
  }, [environmentId])

  const preload = useCallback(
    (when: PreloadWhen) => {
      if (when === "now") {
        load()
        return () => undefined
      }
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS })
        return () => cancelIdleCallback(id)
      }

      const id = setTimeout(load, IDLE_FALLBACK_MS)
      return () => clearTimeout(id)
    },
    [load]
  )

  // A click on something that needs the SDK before it is there: fetch it, and do the click when it arrives
  const act = useCallback(
    (intent: Intent) => {
      if (liveRef.current) return perform(liveRef.current, intent)

      pending.current = intent
      load()
    },
    [load]
  )

  useEffect(() => {
    if (!live || !pending.current) return

    const intent = pending.current
    pending.current = undefined
    perform(live, intent)
  }, [live])

  const value = useMemo<Wallet>(
    () => ({
      status: !environmentId ? "off" : live ? "ready" : isRequested ? "loading" : "idle",
      isSignedIn: live?.isSignedIn ?? false,
      connecting: live?.connecting ?? false,
      approve: live?.approve ?? { switchChain: noWallet, sign: noWallet },
      address: live?.address,
      network: live?.network,
      preload,
      openSignIn: () => act("signIn"),
      linkWallet: () => act("linkWallet"),
      openProfile: () => act("profile"),
      signOut: async () => {
        await liveRef.current?.signOut()
      },
    }),
    [environmentId, live, isRequested, preload, act]
  )

  return (
    <WalletProvider value={value}>
      {children}
      {Sdk && <Sdk publish={setLive} />}
    </WalletProvider>
  )
}
