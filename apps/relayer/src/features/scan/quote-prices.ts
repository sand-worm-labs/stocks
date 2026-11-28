import { zeroAddress, type Address, type PublicClient } from "viem"
import type { ContractKind, Pool } from "../../common/pool.type.js"
import { CBBTC, NATIVE_ETH, UNISWAP_V3_FACTORY, USDC, WETH } from "../../infrastructure/base-mainnet/base-mainnet.constants.js"
import { uniswapV3FactoryAbi } from "../../infrastructure/base-mainnet/mainnet.abis.js"
import { uniswapV3 } from "../../infrastructure/base-mainnet/exchanges.js"
import { readMainnet } from "../../infrastructure/base-mainnet/read-mainnet.js"
import type { TokenInfo } from "../../infrastructure/base-mainnet/read-tokens.js"
import { depthOf } from "./depth.js"

// The tokens a stock trades against that are not a dollar, each priced by its deepest pool against USDC
const PRICED_BY_POOL: Address[] = [WETH, CBBTC]
const DEEPEST_FEE = 500

// What each quote token is worth in dollars. USDC is a dollar; ETH and cbBTC are read from their Uniswap v3 pools against USDC. A token it cannot price is left out,
// and a pool paired with it has no dollar depth.
export async function readQuotePrices(client: PublicClient, tokens: Map<Address, TokenInfo>): Promise<Map<Address, number>> {
  const prices = new Map<Address, number>([[USDC, 1]])
  for (const token of PRICED_BY_POOL) {
    const price = await readPriceAgainstUsdc(client, token, tokens)
    if (price !== undefined) prices.set(token, price)
  }
  const ethPrice = prices.get(WETH)
  if (ethPrice !== undefined) prices.set(NATIVE_ETH, ethPrice)
  return prices
}

async function readPriceAgainstUsdc(client: PublicClient, token: Address, tokens: Map<Address, TokenInfo>): Promise<number | undefined> {
  const tokenInfo = tokens.get(token)
  const usdcInfo = tokens.get(USDC)
  if (!tokenInfo || !usdcInfo) return undefined

  const address = await client.readContract({ address: UNISWAP_V3_FACTORY, abi: uniswapV3FactoryAbi, functionName: "getPool", args: [token, USDC, DEEPEST_FEE] })
  if (address === zeroAddress) return undefined

  const pool: Pool = { name: tokenInfo.symbol, address, kind: uniswapV3.kind as ContractKind }
  const { states } = await readMainnet(client, [pool])
  const state = states.get(address)
  if (!state) return undefined

  const isStockToken0 = token < USDC
  const depth = depthOf(state, { isStockToken0, stockDecimals: tokenInfo.decimals, quoteDecimals: usdcInfo.decimals })
  return depth?.priceInQuote
}
