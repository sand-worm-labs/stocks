"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { PiWallet } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { useWalletEnabled } from "@/components/Wallet/WalletContext"

const BUTTON = buttonVariants({ intent: "outline", size: "md", className: "w-full gap-2" })

function OpenButton() {
  const { setShowAuthFlow } = useDynamicContext()

  return (
    <button type="button" onClick={() => setShowAuthFlow(true)} className={BUTTON}>
      <PiWallet size={20} aria-hidden="true" />
      Connect a wallet
    </button>
  )
}

// Signing in with a wallet is Dynamic's window: Base Account, MetaMask, Coinbase Wallet, Rainbow, Phantom and the rest,
// or email. Where the sign-in lands afterwards is decided when Dynamic reports it is done.
export function WalletOptions() {
  if (useWalletEnabled()) return <OpenButton />

  return (
    <p className="text-ink-400 text-center text-xs">
      Wallet sign-in isn&apos;t set up yet. Add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to switch it on.
    </p>
  )
}
