// What the mirror keeps for each pool. The same shape is read from the mainnet and written to the testnet.
export type PoolState = {
  sqrtPriceX96: bigint
  tick: number
  mainnetBlock: bigint
  liquidity: bigint
}
