"use client"

import { PiCaretDown } from "react-icons/pi"

import { BaseMark } from "@/components/BaseMark/BaseMark"
import { buttonVariants } from "@/components/Button/Button"
import { SIGN_IN_PATH } from "@/lib/auth/config"
import { shortenAddress } from "@/lib/format"
import { cn } from "@/lib/utils"

import { type PreloadWhen, useWallet } from "./WalletContext"

const CONNECT = cn(buttonVariants({ intent: "dark", size: "compact" }), "hidden lg:inline-flex")

// What the header shows for a wallet is ours, in the shape of the rest of it; what it opens is Dynamic's: the window to
// sign in with the list of wallets, and for someone signed in, the panel of what they hold and have done. Someone signed in
// has the SDK fetched once the page is idle, to show their wallet; for anyone else it is fetched as they reach for the
// button, so the window is ready by the time they have clicked.
export function WalletMenu({ preload }: { preload?: PreloadWhen }) {
  const { status, isSignedIn, address, openSignIn, linkWallet, openProfile, preload: fetchSdk } = useWallet(preload)

  if (status === "off") {
    return (
      <a href={SIGN_IN_PATH} className={CONNECT}>
        Connect wallet
      </a>
    )
  }

  if (!isSignedIn) {
    return (
      <button
        type="button"
        onClick={openSignIn}
        onPointerEnter={() => fetchSdk("now")}
        onFocus={() => fetchSdk("now")}
        className={CONNECT}
      >
        Connect wallet
      </button>
    )
  }

  return address ? (
    <button
      type="button"
      onClick={openProfile}
      className={cn(
        "bg-inputBg border-border text-ink-100 hover:bg-hover-bg dark:border-border-tertiary hidden items-center gap-2 rounded-md border py-1 pr-2 pl-2.5 text-sm transition-colors lg:flex dark:bg-[#2E2E2C]"
      )}
    >
      <BaseMark size={14} />
      {shortenAddress(address)}
      <PiCaretDown aria-hidden="true" size={12} className="text-ink-400" />
    </button>
  ) : (
    <button type="button" onClick={linkWallet} className={CONNECT}>
      Link a wallet
    </button>
  )
}
