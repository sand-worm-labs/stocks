"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { useEffect, useState } from "react"

import { appChainById } from "@/constants/chains"
import { readUsdcBalance } from "@/lib/wallet/usdc"

type Reading = { balance: number } | "loading" | "failed"

// The USDC in the connected wallet, on the network it is on. Only to be used where Dynamic is, so under wallets being on.
export function useWalletUsdc() {
  const { primaryWallet, network } = useDynamicContext()
  const address = primaryWallet?.address as `0x${string}` | undefined
  const chain = appChainById(network)
  const [reading, setReading] = useState<Reading>("loading")

  useEffect(() => {
    if (!address || !chain) return
    let current = true
    setReading("loading")
    readUsdcBalance(chain, address)
      .then((balance) => current && setReading({ balance }))
      .catch(() => current && setReading("failed"))
    return () => {
      current = false
    }
  }, [address, chain])

  // `network` is the wallet's own, and may be one we don't work on
  const onUnsupportedNetwork = Boolean(address) && network !== undefined && !chain

  return { connected: Boolean(address), chain, onUnsupportedNetwork, reading }
}
