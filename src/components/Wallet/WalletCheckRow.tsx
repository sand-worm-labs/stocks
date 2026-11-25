"use client"

import { CheckRow } from "@/components/Check/CheckRow"
import { appChainById } from "@/constants/chains"
import { ACTION } from "@/constants/components/wallet/wallet-check-row"
import { shortenAddress } from "@/lib/format"

import { ConnectWalletButton } from "./ConnectWalletButton"
import { useWallet } from "./WalletContext"

export function WalletCheckRow({ chain }: { chain: string }) {
  const { status, address, network } = useWallet("now")

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
