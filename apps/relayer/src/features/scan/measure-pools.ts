import type { Address, Hex, PublicClient } from "viem"
import type { Pool, PoolKind } from "../../common/pool.type.js"
import { BLOCK_EXPLORER, CBBTC, NATIVE_ETH, USDC, WETH } from "../../infrastructure/base-mainnet/base-mainnet.constants.js"
import { readMainnet } from "../../infrastructure/base-mainnet/read-mainnet.js"
import { readTokens, type TokenInfo } from "../../infrastructure/base-mainnet/read-tokens.js"
import { depthOf } from "./depth.js"
import type { Candidate } from "./find-candidates.js"
import { readQuotePrices } from "./quote-prices.js"

// A pool a stock trades in, as the chain says it stands. The dollar figures are missing when the quote token cannot be priced.
export type MeasuredPool = {
  kind: PoolKind
  // A contract's address, or for a v4 pool its id
  pool: Hex
  tickSpacing: number
  fee: number | null
  // The fee as a percent of each trade; nothing when the pool's fee is not known or changes with a hook
  feePercent: number | null
  hooks: Address | null
  // The contract to check the pool on, and the one that made it
  contract: Address
  createdBy: Address
  pairedWith: string
  pairedWithAddress: Address
  // Where to look each of them up
  links: { contract: string; createdBy: string; pairedWith: string; hooks: string | null }
  createdBlock: number
  liquidity: string
  priceUsd: number | null
  depthUsd: number | null
  depthInQuote: number
}

export type Measured = { block: bigint; pools: Map<Address, MeasuredPool[]> }

// Reads every candidate pool at one block and works out its price and depth. A pool that does not answer, or has no price yet, is left out.
export async function measureCandidates(client: PublicClient, candidates: Candidate[]): Promise<Measured> {
  const pools = candidates.map(poolOf)
  const { mainnetBlock, states } = await readMainnet(client, pools)

  const tokens = await readTokens(client, tokensOf(candidates))
  const quotePrices = await readQuotePrices(client, tokens)

  const measured = new Map<Address, MeasuredPool[]>()
  candidates.forEach((candidate, index) => {
    const pool = pools[index]
    const state = pool && states.get(pool.address)
    const stockInfo = tokens.get(candidate.stock)
    const quoteInfo = tokens.get(candidate.quote)
    if (!state || !stockInfo || !quoteInfo) return

    const sides = { isStockToken0: candidate.isStockToken0, stockDecimals: stockInfo.decimals, quoteDecimals: quoteInfo.decimals }
    const depth = depthOf(state, sides)
    if (!depth) return

    const quoteUsd = quotePrices.get(candidate.quote)
    const found = measured.get(candidate.stock) ?? []
    found.push(describe(candidate, quoteInfo, state.liquidity, depth, quoteUsd))
    measured.set(candidate.stock, found)
  })
  for (const found of measured.values()) found.sort(deepestFirst)
  return { block: mainnetBlock, pools: measured }
}

function poolOf({ stock, creation }: Candidate): Pool {
  return creation.asPool(stock)
}

// Every token whose decimals the scan needs, and the ones it prices the quotes with
function tokensOf(candidates: Candidate[]): Address[] {
  const tokens = new Set<Address>([USDC, WETH, CBBTC])
  for (const { stock, quote } of candidates) {
    tokens.add(stock)
    tokens.add(quote)
  }
  return [...tokens]
}

function describe(candidate: Candidate, quote: TokenInfo, liquidity: bigint, depth: { priceInQuote: number; depthInQuote: number }, quoteUsd: number | undefined): MeasuredPool {
  const { creation } = candidate
  return {
    kind: creation.kind,
    pool: creation.id,
    tickSpacing: creation.tickSpacing,
    fee: creation.fee ?? null,
    feePercent: feePercentOf(creation.fee),
    hooks: creation.hooks ?? null,
    contract: creation.contract,
    createdBy: creation.createdBy,
    pairedWith: quote.symbol,
    pairedWithAddress: candidate.quote,
    links: {
      contract: explorerLink(creation.contract),
      createdBy: explorerLink(creation.createdBy),
      pairedWith: explorerLink(candidate.quote),
      hooks: creation.hooks === undefined || creation.hooks === NATIVE_ETH ? null : explorerLink(creation.hooks),
    },
    createdBlock: Number(creation.block),
    liquidity: liquidity.toString(),
    priceUsd: quoteUsd === undefined ? null : significant(depth.priceInQuote * quoteUsd),
    depthUsd: quoteUsd === undefined ? null : Math.round(depth.depthInQuote * quoteUsd * 100) / 100,
    depthInQuote: significant(depth.depthInQuote),
  }
}

// The chain's own ETH has no contract to look up, so its link is the explorer's page for the zero address
export function explorerLink(address: Address): string {
  return `${BLOCK_EXPLORER}/address/${address}`
}

// A v4 pool whose fee has this bit set asks its hooks contract for the fee on every trade
const DYNAMIC_FEE_FLAG = 0x800000

// Fees are in hundredths of a basis point: 3000 is 0.3%
function feePercentOf(fee: number | undefined): number | null {
  if (fee === undefined || fee >= DYNAMIC_FEE_FLAG) return null
  return fee / 10_000
}

// Dollars to the cent hide the price of a cheap token, and 17 digits are noise
function significant(value: number): number {
  return Number(value.toPrecision(8))
}

// By dollars when the quote is priced; a pool in a token that is not (its depth is in that token) goes after the ones that are
function deepestFirst(a: MeasuredPool, b: MeasuredPool): number {
  return (b.depthUsd ?? -1) - (a.depthUsd ?? -1)
}
