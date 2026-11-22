"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"

import { buttonVariants } from "@/components/Button/Button"
import { CheckRow } from "@/components/Check/CheckRow"
import { appChainById } from "@/constants/chains"
import { shortenAddress } from "@/lib/format"

import { ConnectWalletButton } from "./ConnectWalletButton"
import { useWalletEnabled } from "./WalletContext"

const ACTION = buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })

function Row({ chain, testnet = true, address }: { chain: string; testnet?: boolean; address?: string }) {
  return (
    <CheckRow
      status={address ? "pass" : "warn"}
      title={address ? "Wallet connected" : "No wallet connected"}
      description={
        address
          ? `${shortenAddress(address)} on ${chain}${testnet ? " (test network)" : ""}.`
          : `Connect one on ${chain} to buy.`
      }
      action={<ConnectWalletButton className={ACTION}>{address ? "Link another" : "Connect"}</ConnectWalletButton>}
    />
  )
}

function ConnectedRow({ chain }: { chain: string }) {
  const { primaryWallet, network } = useDynamicContext()
  const current = appChainById(network)

  // The network the wallet is on, when it is one of ours; the one the app expects until it has connected
  return <Row chain={current?.name ?? chain} testnet={current?.testnet ?? true} address={primaryWallet?.address} />
}

// The check of whether a wallet is ready to buy with, from what Dynamic says is connected right now
export function WalletCheckRow({ chain }: { chain: string }) {
  return useWalletEnabled() ? <ConnectedRow chain={chain} /> : <Row chain={chain} />
}
