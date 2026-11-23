"use client"

import { shortenAddress } from "@/lib/format"

import { useWallet } from "./WalletContext"

// The address of the wallet in use, shortened, or the words to show when there isn't one
export function WalletAddress({ fallback = "Not connected" }: { fallback?: string }) {
  const { address } = useWallet("now")

  return <>{address ? shortenAddress(address) : fallback}</>
}
