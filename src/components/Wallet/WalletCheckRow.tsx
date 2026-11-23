"use client"

import { buttonVariants } from "@/components/Button/Button"
import { CheckRow } from "@/components/Check/CheckRow"
import { appChainById } from "@/constants/chains"
import { shortenAddress } from "@/lib/format"

import { ConnectWalletButton } from "./ConnectWalletButton"
import { useWallet } from "./WalletContext"

const ACTION = buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })

// The check of whether a wallet is ready to buy with, from what Dynamic says is connected right now
export function WalletCheckRow({ chain }: { chain: string }) {
  const { status, address, network } = useWallet("now")

  // The network the wallet is on, when it is one of ours; the one the app expects until it has connected
  const current = appChainById(network)
  const name = current?.name ?? chain
  const testnet = current?.testnet ?? true

  // Until the wallet's SDK has arrived there is nothing to say yet, and no wallet is the wrong thing to say
  if (status === "idle" || status === "loading") {
    return (
      <CheckRow
        status="warn"
        title="Checking for a wallet…"
        description={`Looking for one on ${chain}.`}
        action={null}
      />
    )
  }

  return (
    <CheckRow
      status={address ? "pass" : "warn"}
      title={address ? "Wallet connected" : "No wallet connected"}
      description={
        address
          ? `${shortenAddress(address)} on ${name}${testnet ? " (test network)" : ""}.`
          : `Connect one on ${name} to buy.`
      }
      action={<ConnectWalletButton className={ACTION}>{address ? "Link another" : "Connect"}</ConnectWalletButton>}
    />
  )
}
