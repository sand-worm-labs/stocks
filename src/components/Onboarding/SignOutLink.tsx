"use client"

import { useRouter } from "next/navigation"

import { useWallet } from "@/components/Wallet/WalletContext"
import { SIGN_IN_PATH } from "@/lib/auth/config"

// A way out for someone who landed on another person's session. It ends the sign-in, here and with Dynamic.
export function SignOutLink() {
  const { status, signOut } = useWallet("now")
  const router = useRouter()

  // It is there once the wallet's SDK is, for that is what has to be told
  if (status !== "ready") return null

  return (
    <button
      type="button"
      className="text-ink-300 hover:text-ink-100 text-sm transition-colors"
      onClick={async () => {
        await signOut()
        router.replace(SIGN_IN_PATH)
      }}
    >
      Not you? Sign out
    </button>
  )
}
