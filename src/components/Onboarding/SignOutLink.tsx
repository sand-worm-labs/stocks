"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { useRouter } from "next/navigation"

import { useWalletEnabled } from "@/components/Wallet/WalletContext"
import { SIGN_IN_PATH } from "@/lib/auth/config"

const CLASSNAME = "text-ink-300 hover:text-ink-100 text-sm transition-colors"

function DynamicSignOut() {
  const { handleLogOut } = useDynamicContext()
  const router = useRouter()

  return (
    <button
      type="button"
      className={CLASSNAME}
      onClick={async () => {
        await handleLogOut()
        router.replace(SIGN_IN_PATH)
      }}
    >
      Not you? Sign out
    </button>
  )
}

// A way out for someone who landed on another person's session. It ends the sign-in, here and with Dynamic.
export function SignOutLink() {
  return useWalletEnabled() ? <DynamicSignOut /> : null
}
