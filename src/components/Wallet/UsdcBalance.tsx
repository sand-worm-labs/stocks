"use client"

import { formatAmount } from "@/lib/format"

import { useWalletUsdc } from "./useWalletUsdc"

const NONE = "Connect a wallet to see it"

// The USDC in the wallet, in words, for a line of text
export function UsdcBalance() {
  const { connected, chain, reading, isWaiting } = useWalletUsdc()

  if (isWaiting) return <>Checking your wallet…</>
  if (!connected || !chain) return <>{NONE}</>
  if (reading === "loading") return <>Checking {chain.name}…</>
  if (reading === "failed") return <>Couldn&apos;t read it on {chain.name}</>
  return (
    <>
      {formatAmount(reading.balance)} USDC on {chain.name}
    </>
  )
}
