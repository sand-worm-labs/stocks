"use client"

import { NONE } from "@/constants/components/wallet/usdc-balance"
import { formatAmount } from "@/lib/format"

import { useWalletUsdc } from "./useWalletUsdc"

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
