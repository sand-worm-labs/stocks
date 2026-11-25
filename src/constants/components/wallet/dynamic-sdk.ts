import { APP_CHAINS } from "@/constants/chains"

// The networks the app works on, in the order they are offered: Base Sepolia, where paper trading's USDC is free, then
// Base. Whatever else the dashboard has switched on, Ethereum included, isn't offered, unless none of these is on at all.
export const APP_CHAIN_IDS: number[] = APP_CHAINS.map(({ id }) => id)
