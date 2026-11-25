// Calls the Stocks API, which keeps everything that is stored. Only the server calls it, with the key the two share.
export const stocksApiUrl = () => process.env.STOCKS_API_URL?.replace(/\/$/, "")

export async function callStocksApi(path: string, init: RequestInit = {}) {
  const response = await fetch(`${stocksApiUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.STOCKS_API_KEY ?? ""}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  const isMissing = response.status === 404
  if (!response.ok && !isMissing) throw new Error(`The Stocks API answered ${response.status} for ${path}`)
  return response
}
