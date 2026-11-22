"use client"

import { DynamicUserProfile, useDynamicContext, useDynamicModals } from "@dynamic-labs/sdk-react-core"
import { PiCaretDown } from "react-icons/pi"

import { BaseMark } from "@/components/BaseMark/BaseMark"
import { buttonVariants } from "@/components/Button/Button"
import { SIGN_IN_PATH } from "@/lib/auth/config"
import { shortenAddress } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useWalletEnabled } from "./WalletContext"

const CONNECT = buttonVariants({ intent: "dark", size: "compact", className: "hidden lg:inline-flex" })

// What the header shows for a wallet is ours, in the shape of the rest of it; what it opens is Dynamic's: the window to
// sign in with the list of wallets, and for someone signed in, the panel of what they hold and have done.
function DynamicMenu() {
  const { user, primaryWallet, setShowAuthFlow, setShowDynamicUserProfile } = useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()

  if (!user) {
    return (
      <button type="button" onClick={() => setShowAuthFlow(true)} className={CONNECT}>
        Connect wallet
      </button>
    )
  }

  return (
    <>
      {primaryWallet ? (
        <button
          type="button"
          onClick={() => setShowDynamicUserProfile(true)}
          className={cn(
            "bg-inputBg border-border text-ink-100 hover:bg-hover-bg dark:border-border-tertiary hidden items-center gap-2 rounded-md border py-1 pr-2 pl-2.5 text-sm transition-colors lg:flex dark:bg-[#2E2E2C]"
          )}
        >
          <BaseMark size={14} />
          {shortenAddress(primaryWallet.address)}
          <PiCaretDown aria-hidden="true" size={12} className="text-ink-400" />
        </button>
      ) : (
        <button type="button" onClick={() => setShowLinkNewWalletModal(true)} className={CONNECT}>
          Link a wallet
        </button>
      )}
      <DynamicUserProfile />
    </>
  )
}

export function WalletMenu() {
  if (useWalletEnabled()) return <DynamicMenu />

  return (
    <a href={SIGN_IN_PATH} className={CONNECT}>
      Connect wallet
    </a>
  )
}
