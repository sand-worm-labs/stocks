"use client"

import { CheckRow } from "@/components/Check/CheckRow"
import { FAUCET_URL } from "@/constants/settings"
import { formatAmount } from "@/lib/format"

import { useWalletUsdc } from "./useWalletUsdc"

type Row = { status: "pass" | "warn"; title: string; description: string; faucet?: boolean }

const FAUCET = (
  <a
    href={FAUCET_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="text-accent dark:text-primary text-sm font-medium hover:underline"
  >
    Get test USDC ↗
  </a>
)

// The check of whether there is any USDC to buy with: what the connected wallet holds, read from the chain it is on
export function UsdcCheckRow() {
  const { connected, chain, onUnsupportedNetwork, reading, isWaiting } = useWalletUsdc()
  let row: Row

  if (isWaiting) {
    row = { status: "warn", title: "USDC to spend: …", description: "Checking your wallet." }
  } else if (!connected) {
    row = { status: "warn", title: "USDC to spend: —", description: "Connect a wallet to see what you have to spend." }
  } else if (onUnsupportedNetwork || !chain) {
    row = { status: "warn", title: "USDC to spend: —", description: "Switch your wallet to Base or Base Sepolia." }
  } else if (reading === "loading") {
    row = { status: "warn", title: "USDC to spend: …", description: `Checking your wallet on ${chain.name}.` }
  } else if (reading === "failed") {
    row = {
      status: "warn",
      title: "USDC to spend: —",
      description: `Couldn't read your USDC on ${chain.name}. Try again in a moment.`,
    }
  } else if (reading.balance > 0) {
    row = {
      status: "pass",
      title: `USDC to spend: ${formatAmount(reading.balance)}`,
      description: `In your wallet on ${chain.name}.`,
    }
  } else {
    row = {
      status: "warn",
      title: "USDC to spend: 0",
      description: chain.testnet
        ? "Get free test USDC to try a real buy, or start with paper trading."
        : "Add USDC to your wallet to buy for real, or start with paper trading.",
      faucet: chain.testnet,
    }
  }

  return (
    <CheckRow status={row.status} title={row.title} description={row.description} action={row.faucet ? FAUCET : null} />
  )
}
