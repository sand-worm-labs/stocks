import { callStocksApi, stocksApiUrl } from "./stocks-api"

let hasSaidItIsMissing = false

// Market data (prices, tokens, pools) comes from the Stocks API, which asks Yahoo, CoinGecko and DexScreener once and keeps the answers. When it can't be
// reached the page still draws, with what it has, so a refusal here is `fallback` and not a crash.
export async function fromMarket<T>(path: string, fallback: T, timeoutMs?: number): Promise<T> {
  if (!stocksApiUrl()) {
    if (!hasSaidItIsMissing) console.error("Market data comes from the Stocks API: set STOCKS_API_URL (and run it, see the README)")
    hasSaidItIsMissing = true
    return fallback
  }

  try {
    const response = await callStocksApi(path, {}, timeoutMs)
    return response.ok ? ((await response.json()) as T) : fallback
  } catch (error) {
    console.error(`Market data is not available (${path}):`, error)
    return fallback
  }
}

// A list in a query string, which the API reads as comma separated
export const listOf = (items: string[]) => items.map(encodeURIComponent).join(",")

// Asks for a long list a part at a time, since the API takes a limited number per call
export async function inParts<T>(items: string[], size: number, ask: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const parts = Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
  return (await Promise.all(parts.map(ask))).flat()
}

// How soon an empty answer, which is what comes back when the API can't be reached, is asked about again
const EMPTY_KEPT_MS = 2_000

// One answer shared by everyone asking for the same thing within `keptMs`, or at the same moment. The swap feed asks on every trade it hears,
// so asking the API each time floods it. An empty answer leaves the last good one in place.
export function shared<T>(keptMs: number, load: (key: string) => Promise<T[]>) {
  const kept = new Map<string, { until: number; items: T[] }>()
  const loading = new Map<string, Promise<T[]>>()

  const refresh = async (key: string) => {
    const fresh = await load(key)
    const items = fresh.length ? fresh : (kept.get(key)?.items ?? [])
    const until = Date.now() + (fresh.length ? keptMs : Math.min(keptMs, EMPTY_KEPT_MS))
    kept.set(key, { until, items })
    return items
  }

  return (key: string) => {
    const known = kept.get(key)
    if (known && Date.now() < known.until) return Promise.resolve(known.items)

    const pending = loading.get(key) ?? refresh(key).finally(() => loading.delete(key))
    loading.set(key, pending)
    return pending
  }
}
