"use client"

import type { ReactNode } from "react"

import { useWallet } from "./WalletContext"

type ConnectWalletButtonProps = { className?: string; children: ReactNode }

// Signed in already, by email or an account, a wallet is linked to who they are, in the same window and with no trip to a
// sign-in page. Nobody signed in is asked to sign in, and a wallet is one way to. The SDK is fetched as the pointer comes
// near, so the window is there by the time it is clicked.
export function ConnectWalletButton({ className, children }: ConnectWalletButtonProps) {
  const { status, isSignedIn, openSignIn, linkWallet, preload } = useWallet()

  if (status === "off") return null

  return (
    <button
      type="button"
      className={className}
      onClick={isSignedIn ? linkWallet : openSignIn}
      onPointerEnter={() => preload("now")}
      onFocus={() => preload("now")}
    >
      {children}
    </button>
  )
}
