"use client"

import { createContext, useContext, useEffect } from "react"

// Where Dynamic's wallet SDK stands. "off": wallets aren't set up (no environment ID). "idle": set up, the SDK not asked
// for yet. "loading": its code is on the way. "ready": it is running and what it says is below.
type WalletStatus = "off" | "idle" | "loading" | "ready"

// What the SDK tells the rest of the app, as plain values, so that nothing outside the one file that loads the SDK has to
// import it, and the pages that only mention a wallet don't carry its weight
// What approving a strategy to trade takes of the wallet that is connected. Neither moves any money. Each fails with a message fit to show:
// no wallet that can do it, or the person turning the request down.
export type ApproveWith = {
  // Moves the wallet to this network
  switchChain: (chainId: number) => Promise<void>
  // Has the wallet's owner sign some words, to prove the wallet is theirs
  sign: (message: string) => Promise<{ address: `0x${string}`; signature: `0x${string}` }>
}

export type Published = {
  approve: ApproveWith
  isSignedIn: boolean
  // A sign-in is under way: the wallet window is open, or it has finished and the session is being made and the page changed. While
  // it is, asking for another one has nothing to do.
  connecting: boolean
  address?: string
  network?: number | string
  openSignIn: () => void
  linkWallet: () => void
  openProfile: () => void
  signOut: () => Promise<void>
}

// When to start fetching the SDK: now, or when the browser has nothing better to do
export type PreloadWhen = "now" | "idle"

export type Wallet = Pick<
  Published,
  | "isSignedIn"
  | "connecting"
  | "address"
  | "network"
  | "openSignIn"
  | "linkWallet"
  | "openProfile"
  | "signOut"
  | "approve"
> & {
  status: WalletStatus
  // Starts fetching the SDK, and returns what undoes a wait for idle time
  preload: (when: PreloadWhen) => () => void
}

const NOTHING = () => undefined
const NO_WALLET = async () => Promise.reject(new Error("Connect your wallet first"))

const WalletContext = createContext<Wallet>({
  status: "off",
  isSignedIn: false,
  connecting: false,
  approve: { switchChain: NO_WALLET, sign: NO_WALLET },
  preload: () => NOTHING,
  openSignIn: NOTHING,
  linkWallet: NOTHING,
  openProfile: NOTHING,
  signOut: async () => undefined,
})

export const WalletProvider = WalletContext.Provider

// The wallet as the app sees it. A page that is about the wallet asks for the SDK with `"now"`; one that only shows it
// when there is one asks for it `"idle"`, and the rest leave it to be fetched when someone reaches for it.
export function useWallet(load?: PreloadWhen) {
  const wallet = useContext(WalletContext)
  const { preload } = wallet

  useEffect(() => (load ? preload(load) : undefined), [load, preload])

  return wallet
}
