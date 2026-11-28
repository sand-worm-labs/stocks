import { parseAbi } from "viem"

export const mirrorBookAbi = parseAbi([
  "function postMany(address[] pools, (uint160 sqrtPriceX96, int24 tick, uint64 mainnetBlock, uint128 liquidity)[] states, uint64 mainnetBlock)",
  "function relayer() view returns (address)",
  "function batches() view returns (uint256)",
])
