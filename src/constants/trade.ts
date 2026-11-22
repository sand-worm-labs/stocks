export const SWAP_FEE_RATE = 0.003
export const NETWORK_FEE = 0.01
export const SLIPPAGE_CHOICES = [0.001, 0.005, 0.01]
export const DEFAULT_SLIPPAGE = 0.005
// How much selling moves a token's price, until it is read from the pool
export const SELL_PRICE_IMPACT = 0.0005
export const SELL_FRACTIONS = [
  { value: 0.25, label: "25%" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "All" },
]
export const DEFAULT_ADD_FUNDS = 100
export const ADD_FUNDS_CHOICES = [
  { value: 50, label: "50 USDC" },
  { value: 100, label: "100 USDC" },
  { value: 250, label: "250 USDC" },
]
