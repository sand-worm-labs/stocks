"use client"

import { useEffect, useState } from "react"

import { appChainById } from "@/constants/chains"
import { readUsdcBalance } from "@/lib/wallet/usdc"

import { useWallet } from "./WalletContext"

type Reading = { balance: number } | "loading" | "failed"

export function useWalletUsdc() {
  const { status, address: connected, network } = useWallet("now")
  const address = connected as `0x${string}` | undefined
  const chain = appChainById(network)
  const [done, setDone] = useState<{ for: string; reading: Exclude<Reading, "loading"> }>()
  const key = address && chain ? `${chain.id}:${address}` : undefined

  useEffect(() => {
    if (!address || !chain || !key) return
    let current = true
    readUsdcBalance(chain, address)
      .then((balance) => current && setDone({ for: key, reading: { balance } }))
      .catch(() => current && setDone({ for: key, reading: "failed" }))
    return () => {
      current = false
    }
  }, [address, chain, key])
  const reading: Reading = done && done.for === key ? done.reading : "loading"

  const onUnsupportedNetwork = Boolean(address) && network !== undefined && !chain

  return {
    connected: Boolean(address),
    chain,
    onUnsupportedNetwork,
    reading,
    isWaiting: status === "idle" || status === "loading",
  }
}
