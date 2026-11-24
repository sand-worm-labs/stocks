"use client"

import { useState } from "react"
import { PiCircleNotch, PiWallet } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { useWallet } from "@/components/Wallet/WalletContext"
import { cn } from "@/lib/utils"

const BUTTON = buttonVariants({ intent: "outline", size: "md", className: "w-full gap-2" })

// Signing in with a wallet is Dynamic's window: Base Account, MetaMask, Coinbase Wallet, Rainbow, Phantom and the rest,
// or email. Where the sign-in lands afterwards is decided when Dynamic reports it is done. This page is for signing in, so
// the SDK is fetched as it opens; a click before it has come is carried out when it does.
//
// From the click until the page has changed the button is busy: it spins and cannot be pressed, so a sign-in that is already under
// way (the SDK on its way, the wallet window open, the session being made, the page opening) is never started a second time. If the
// window is closed without signing in, or the sign-in fails, it is free again.
export function WalletOptions() {
  const { status, connecting, openSignIn } = useWallet("now")
  const [clicked, setClicked] = useState(false)
  // Between the click and the SDK being there to answer it, and while it is answering
  const busy = connecting || (clicked && status !== "ready")

  if (status === "off") {
    return (
      <p className="text-ink-400 text-center text-xs">
        Wallet sign-in isn&apos;t set up yet. Add NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to switch it on.
      </p>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        if (busy) return
        setClicked(true)
        openSignIn()
      }}
      className={cn(BUTTON, "disabled:cursor-wait disabled:opacity-70")}
    >
      {busy ? (
        <PiCircleNotch size={20} aria-hidden="true" className="animate-spin" />
      ) : (
        <PiWallet size={20} aria-hidden="true" />
      )}
      {busy ? "Connecting…" : "Connect a wallet"}
    </button>
  )
}
