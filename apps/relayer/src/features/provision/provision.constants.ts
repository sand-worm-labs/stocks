export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

// Under this a pool holds too little to be a market worth copying
export const MIN_LIQUIDITY_USD = 100

// The stock tokens have 8 decimals and USDC has 6
export const STOCK_DECIMALS = 1e8
export const USDC_DECIMALS = 1e6

// Uniswap v4 caps a pool's tick spacing here
export const MAX_TICK_SPACING = 32_767
