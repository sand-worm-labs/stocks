import { z } from "zod"

import { BASE_RPC_URL, COINGECKO_URL } from "@/constants/markets"

export type TokenSupply = { totalSupply: number; decimals: number }

const TOTAL_SUPPLY = "0x18160ddd"
const DECIMALS = "0x313ce567"
const SUPPLY_CACHE_MS = 5 * 60 * 1000
const ETH_CACHE_MS = 60 * 1000

const rpcSchema = z.object({ result: z.string() })

const call = async (to: string, data: string) => {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })
  return BigInt(rpcSchema.parse(await response.json()).result)
}

const supplies = new Map<string, { at: number; supply: TokenSupply }>()

export async function getTokenSupply(address: string): Promise<TokenSupply | undefined> {
  const cached = supplies.get(address)
  if (cached && Date.now() - cached.at < SUPPLY_CACHE_MS) return cached.supply

  try {
    const [raw, decimals] = await Promise.all([call(address, TOTAL_SUPPLY), call(address, DECIMALS)])
    const supply = { totalSupply: Number(raw) / 10 ** Number(decimals), decimals: Number(decimals) }
    supplies.set(address, { at: Date.now(), supply })
    return supply
  } catch {
    return cached?.supply
  }
}

let ethPrice: { at: number; usd: number } | undefined

export async function getEthPrice(): Promise<number | undefined> {
  if (ethPrice && Date.now() - ethPrice.at < ETH_CACHE_MS) return ethPrice.usd

  try {
    const response = await fetch(`${COINGECKO_URL}/simple/price?ids=ethereum&vs_currencies=usd`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    const usd = z.object({ ethereum: z.object({ usd: z.number() }) }).parse(await response.json()).ethereum.usd
    ethPrice = { at: Date.now(), usd }
    return usd
  } catch {
    return ethPrice?.usd
  }
}

const NAME = "0x06fdde03"
const SYMBOL = "0x95d89b41"

const callRaw = async (to: string, data: string) => {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })
  return rpcSchema.parse(await response.json()).result
}

function decodeString(hex: string) {
  const body = hex.slice(2)
  const length = parseInt(body.slice(64, 128), 16)
  return Buffer.from(body.slice(128, 128 + length * 2), "hex").toString("utf8")
}

type TokenContract = TokenSupply & { name: string; symbol: string }

const contracts = new Map<string, TokenContract>()

export async function getTokenContract(address: string): Promise<TokenContract | undefined> {
  const known = contracts.get(address)
  if (known) return known

  try {
    const [supply, name, symbol] = await Promise.all([
      getTokenSupply(address),
      callRaw(address, NAME),
      callRaw(address, SYMBOL),
    ])
    if (!supply) return undefined

    const contract = { ...supply, name: decodeString(name), symbol: decodeString(symbol) }
    contracts.set(address, contract)
    return contract
  } catch {
    return undefined
  }
}
