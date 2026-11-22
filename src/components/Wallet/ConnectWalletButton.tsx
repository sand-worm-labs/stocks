"use client"

import { useDynamicContext, useDynamicModals } from "@dynamic-labs/sdk-react-core"
import type { ReactNode } from "react"

import { useWalletEnabled } from "./WalletContext"

type ConnectWalletButtonProps = { className?: string; children: ReactNode }

function ConnectButton({ className, children }: ConnectWalletButtonProps) {
  const { user, setShowAuthFlow } = useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()

  // Signed in already, by email or an account, a wallet is linked to who they are, in the same window and with no trip
  // to a sign-in page. Nobody signed in is asked to sign in, and a wallet is one way to.
  return (
    <button
      type="button"
      className={className}
      onClick={() => (user ? setShowLinkNewWalletModal(true) : setShowAuthFlow(true))}
    >
      {children}
    </button>
  )
}

export function ConnectWalletButton(props: ConnectWalletButtonProps) {
  return useWalletEnabled() ? <ConnectButton {...props} /> : null
}
