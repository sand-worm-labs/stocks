"use client"

import { PiWallet } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { useWallet } from "@/components/Wallet/WalletContext"

const BUTTON = buttonVariants({ intent: "outline", size: "md", className: "w-full gap-2" })

// Signing in with a wallet is Dynamic's window: Base Account, MetaMask, Coinbase Wallet, Rainbow, Phantom and the rest,
// or email. Where the sign-in lands afterwards is decided when Dynamic reports it is done. This page is for signing in, so
// the SDK is fetched as it opens; a click before it has come is carried out when it does.
export function WalletOptions() {
  const { status, openSignIn } = useWallet("now")

  if (status === "off") {
    return (
      <p className="text-ink-400 text-center text-xs">
        Wallet sign-in isn&apos;t set up yet. Add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to switch it on.
      </p>
    )
  }

  return (
    <button type="button" onClick={openSignIn} className={BUTTON}>
      <PiWallet size={20} aria-hidden="true" />
      Connect a wallet
    </button>
  )
}
