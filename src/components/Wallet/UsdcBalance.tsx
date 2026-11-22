"use client"

import { formatAmount } from "@/lib/format"

import { useWalletUsdc } from "./useWalletUsdc"
import { useWalletEnabled } from "./WalletContext"

const NONE = "Connect a wallet to see it"

function Connected() {
  const { connected, chain, reading } = useWalletUsdc()

  if (!connected || !chain) return <>{NONE}</>
  if (reading === "loading") return <>Checking {chain.name}…</>
  if (reading === "failed") return <>Couldn&apos;t read it on {chain.name}</>
  return (
    <>
      {formatAmount(reading.balance)} USDC on {chain.name}
    </>
  )
}

// The USDC in the wallet, in words, for a line of text
export function UsdcBalance() {
  return useWalletEnabled() ? <Connected /> : <>{NONE}</>
}
