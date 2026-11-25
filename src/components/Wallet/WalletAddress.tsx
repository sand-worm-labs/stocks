"use client"

import { shortenAddress } from "@/lib/format"

import { useWallet } from "./WalletContext"

export function WalletAddress({ fallback = "Not connected" }: { fallback?: string }) {
  const { address } = useWallet("now")

  return <>{address ? shortenAddress(address) : fallback}</>
}
