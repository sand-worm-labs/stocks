import type { PoolQuote } from "./pools"

// The two kinds of swap event a pool on Base emits: Uniswap V3 style (the newer pools, Aerodrome's included) and the
// older V2 style
export const V3_SWAP = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
export const V2_SWAP = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const USDC_DECIMALS = 1e6
const WORD = 64
const TWO_96 = 2 ** 96

export type Swap = {
  // The token traded, lowercase
  token: string
  side: "buy" | "sell"
  // The token's price in dollars after the trade, where the pool is traded against USDC
  price?: number
  // What the trade was worth in dollars, where the pool is traded against USDC
  usd?: number
  at: number
}

export type SwapLog = { address: string; topics: string[]; data: string }

const word = (data: string, index: number) => BigInt(`0x${data.slice(2 + index * WORD, 2 + (index + 1) * WORD)}`)
const signed = (value: bigint) => Number(BigInt.asIntN(256, value))

// Reads one swap. The pool's two tokens are ordered by address, so which of them is the stock token decides which way
// the numbers point.
export function decodeSwap(log: SwapLog, pool: PoolQuote, now = Date.now()): Swap | undefined {
  const stockIsToken0 = pool.address < pool.quote
  const [topic] = log.topics

  // The token's amounts and the price of token1 in token0, in the units the contract counts in
  let stock: number
  let quote: number
  let ratio: number

  if (topic === V3_SWAP) {
    const [amount0, amount1] = [signed(word(log.data, 0)), signed(word(log.data, 1))]
    ratio = (Number(word(log.data, 2)) / TWO_96) ** 2
    ;[stock, quote] = stockIsToken0 ? [amount0, amount1] : [amount1, amount0]
    // The pool's amounts are from its side: negative is what it paid out
    stock = -stock
    quote = -quote
  } else if (topic === V2_SWAP) {
    const [in0, in1, out0, out1] = [0, 1, 2, 3].map((i) => Number(word(log.data, i))) as [
      number,
      number,
      number,
      number,
    ]
    ratio = in0 > 0 && out1 > 0 ? out1 / in0 : in1 > 0 && out0 > 0 ? in1 / out0 : 0
    ;[stock, quote] = stockIsToken0 ? [out0 - in0, out1 - in1] : [out1 - in1, out0 - in0]
  } else {
    return undefined
  }

  const swap: Swap = { token: pool.address, side: stock > 0 ? "buy" : "sell", at: now }
  if (pool.quote !== USDC || !ratio || pool.price <= 0) return swap

  // The token's price in USDC, from the pool's own numbers. The token's decimals aren't known here, so they are read
  // off the last price: the difference is always a power of ten.
  const raw = stockIsToken0 ? ratio : 1 / ratio
  const decimals = Math.round(Math.log10(pool.price / raw))

  return { ...swap, price: raw * 10 ** decimals, usd: Math.abs(quote) / USDC_DECIMALS }
}
