import { baseSepolia } from "viem/chains"

// Where trading with a wallet happens, for now: Base Sepolia, on its test USDC. Moving to Base is changing this one line.
export const TRADE_CHAIN = baseSepolia

export const SWAP_FEE_RATE = 0.003
export const NETWORK_FEE = 0.01
export const MIN_BUY_AMOUNT = 1
// The most that can be put in at once while the trading is paper, where the USDC is free
export const PAPER_DEPOSIT_MAX = 100_000
