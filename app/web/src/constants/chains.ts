import { base, baseSepolia } from "viem/chains"

export const APP_CHAINS = [baseSepolia, base] as const

export const appChainById = (id: number | string | undefined) => APP_CHAINS.find((chain) => chain.id === Number(id))

// Circle's USDC on each of them, which both have 6 decimals
export const USDC_ADDRESS = {
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const

export const USDC_DECIMALS = 6
