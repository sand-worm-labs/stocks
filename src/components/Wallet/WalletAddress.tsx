"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"

import { shortenAddress } from "@/lib/format"

import { useWalletEnabled } from "./WalletContext"

function ConnectedAddress({ fallback }: { fallback: string }) {
  const { primaryWallet } = useDynamicContext()
  return <>{primaryWallet ? shortenAddress(primaryWallet.address) : fallback}</>
}

// The address of the wallet in use, shortened, or the words to show when there isn't one
export function WalletAddress({ fallback = "Not connected" }: { fallback?: string }) {
  return useWalletEnabled() ? <ConnectedAddress fallback={fallback} /> : <>{fallback}</>
}
