// Calls the Stocks API, which keeps everything that is stored and makes the market data calls. Only the server calls it, with the key the two share.
export const stocksApiUrl = () => process.env.STOCKS_API_URL?.replace(/\/$/, "")

const DEFAULT_TIMEOUT_MS = 10_000

// The answer as it came, whatever it was, for a caller that wants to read why it was refused
export async function callStocksApiRaw(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetch(`${stocksApiUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.STOCKS_API_KEY ?? ""}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function callStocksApi(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await callStocksApiRaw(path, init, timeoutMs)
  const isMissing = response.status === 404
  if (!response.ok && !isMissing) throw new Error(`The Stocks API answered ${response.status} for ${path}`)
  return response
}
