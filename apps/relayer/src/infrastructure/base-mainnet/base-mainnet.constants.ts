import type { Address } from "viem"

// Uniswap v4 keeps every pool inside its pool manager; StateView is its read-only window on them, asked by pool id.
// Base mainnet: https://docs.uniswap.org/contracts/v4/deployments
export const UNISWAP_V4_STATE_VIEW: Address = "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71"

// Multicall3 is at the same address on every chain; it answers many reads in one request
export const MULTICALL3: Address = "0xcA11bde05977b3631167028862bE2a173976CA11"

// Uniswap v4's pool manager, where every v4 pool lives and says its swaps
export const UNISWAP_V4_POOL_MANAGER: Address = "0x498581ff718922c3f8e6a244956af099b2652b2b"

// How many addresses (or pool ids) one eth_getLogs filter may name. A public RPC takes about this many and answers a longer list with an error.
export const LOG_FILTER_SIZE = 10

// The tokens a stock trades against, and what the scan prices them in
export const USDC: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
export const WETH: Address = "0x4200000000000000000000000000000000000006"
export const CBBTC: Address = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf"
// Uniswap v4 trades the chain's own ETH as the zero address
export const NATIVE_ETH: Address = "0x0000000000000000000000000000000000000000"

// The factories that make the v3-style pools. Aerodrome has three Slipstream factories in use at once (each pool says its own with `factory()`), and
// DexScreener names two of them differently ("aero" and "aerodrome"), so a scan has to read all three.
export const UNISWAP_V3_FACTORY: Address = "0x33128a8fc17869897dce68ed026d694621f6fdfd"
export const AERODROME_CL_FACTORIES: Address[] = [
  "0x5e7bb104d84c7cb9b682aac2f3d509f5f406809a",
  "0x9cb220581b91b0c83223012fe69688b92ad07a76",
  "0xf8f2eb4940cfe7d13603dddd87f123820fc061ef",
]

// The widest range of blocks the public RPC answers eth_getLogs for
export const LOG_RANGE = 50_000n

// Where a person looks a contract up to check it
export const BLOCK_EXPLORER = "https://basescan.org"
