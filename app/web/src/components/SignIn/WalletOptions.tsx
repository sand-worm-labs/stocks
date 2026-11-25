"use client"

import { useState } from "react"
import { PiCircleNotch, PiWallet } from "react-icons/pi"

import { useWallet } from "@/components/Wallet/WalletContext"
import { BUTTON } from "@/constants/components/sign-in/wallet-options"
import { cn } from "@/lib/utils"

export function WalletOptions() {
  const { status, connecting, openSignIn } = useWallet("now")
  const [clicked, setClicked] = useState(false)
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
