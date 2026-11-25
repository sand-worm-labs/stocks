"use client"

import type { ReactNode } from "react"

import { useWallet } from "./WalletContext"

type ConnectWalletButtonProps = { className?: string; children: ReactNode }

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
