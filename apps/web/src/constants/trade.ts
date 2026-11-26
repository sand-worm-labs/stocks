import { baseSepolia } from "viem/chains"

// Where trading with a wallet happens, for now: Base Sepolia, on its test USDC. Moving to Base is changing this one line.
export const TRADE_CHAIN = baseSepolia

export const SWAP_FEE_RATE = 0.003
export const NETWORK_FEE = 0.01
export const SLIPPAGE_CHOICES = [0.001, 0.005, 0.01]
export const DEFAULT_SLIPPAGE = 0.005
// How much selling moves a token's price, until it is read from the pool
export const SELL_PRICE_IMPACT = 0.0005
export const MIN_SELL_AMOUNT = 1
export const MIN_BUY_AMOUNT = 1
// The most that can be put in at once while the trading is paper, where the USDC is free
export const PAPER_DEPOSIT_MAX = 100_000
export const QUICK_FRACTIONS = [0.25, 0.5, 0.75] as const
export const DEFAULT_ADD_FUNDS = 100
export const ADD_FUNDS_CHOICES = [
  { value: 50, label: "50 USDC" },
  { value: 100, label: "100 USDC" },
  { value: 250, label: "250 USDC" },
  { value: 1000, label: "1,000 USDC" },
  { value: 5000, label: "5,000 USDC" },
]
