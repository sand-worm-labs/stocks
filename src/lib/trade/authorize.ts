import type { Hex } from "viem"

import { TRADE_CHAIN } from "@/constants/trade"
import { StrategyError } from "@/lib/strategies/service"

// What the check needs of the chain: whether a signature is the wallet's (which also covers wallets that are contracts), and how much
// USDC it holds. Both only read. viem's public client does the first, `readUsdcBalance` the second; the tests give small stand-ins.
export type Chain = {
  verifyMessage(args: { address: Hex; message: string; signature: Hex }): Promise<boolean>
  usdcBalance(address: Hex): Promise<number>
}

// How long an approval stays good for once it is signed, so a signature that is somehow kept can't be used later
export const APPROVAL_WINDOW_MS = 15 * 60 * 1000

type Approval = {
  strategyId: string
  address: Hex
  // The most the strategy may use of the wallet's USDC, fees included
  limit: number
  // When the approval stops being good, as an ISO time
  expires: string
}

// The words the wallet signs. They say, in plain language, what is being approved, and nothing leaves the wallet by signing them: the
// money stays with its owner. Everything that matters (which strategy, which wallet, how much, until when) is in the words, so a
// signature can't be moved onto anything else.
export const approvalMessage = ({ strategyId, address, limit, expires }: Approval) =>
  [
    "Sandworm Stocks",
    "",
    `I approve strategy ${strategyId} to trade up to ${limit.toFixed(2)} USDC from my wallet ${address} on ${TRADE_CHAIN.name}.`,
    "",
    `Nothing is sent by signing this. The approval ends ${expires}.`,
  ].join("\n")

// Proves a person has approved a strategy to trade from their own wallet, from the chain and not from the browser's word: the approval is
// still good, the wallet's owner signed exactly these words, and the wallet holds the USDC. Nothing is moved or kept. Returns the balance.
export async function verifyApproval(chain: Chain, approval: Approval & { signature: Hex }, now = new Date()) {
  const refuse = (message: string): never => {
    throw new StrategyError(message, 422)
  }

  const until = Date.parse(approval.expires)
  if (!Number.isFinite(until) || until <= now.getTime() || until > now.getTime() + APPROVAL_WINDOW_MS) {
    refuse("That approval has expired. Try again")
  }

  const signed = await chain
    .verifyMessage({ address: approval.address, message: approvalMessage(approval), signature: approval.signature })
    .catch(() => false)
  if (!signed) refuse("The wallet's signature didn't match this approval")

  const balance = await chain
    .usdcBalance(approval.address)
    .catch(() => refuse("We couldn't read your wallet's USDC just now. Try again"))
  if (balance < approval.limit)
    refuse(
      `Your wallet holds ${balance.toFixed(2)} USDC on ${TRADE_CHAIN.name}, less than the ${approval.limit.toFixed(2)} this needs`
    )
  return balance
}
