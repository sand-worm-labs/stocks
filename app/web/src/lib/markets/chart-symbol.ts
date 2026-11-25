import { z } from "zod"

import { QUOTE_URL } from "@/constants/markets"

const EXCHANGES: Record<string, string> = {
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NYQ: "NYSE",
  ASE: "AMEX",
  PCX: "NYSE ARCA",
  BTS: "CBOE",
}

const metaSchema = z.object({
  chart: z.object({ result: z.array(z.object({ meta: z.object({ exchangeName: z.string() }) })).nonempty() }),
})

const found = new Map<string, string>()

// A bare ticker like META is a different thing on other exchanges, and the chart takes the first it finds. Knowing the
// exchange that lists the share makes it NASDAQ:META.
export async function getChartSymbol(ticker: string): Promise<string> {
  const known = found.get(ticker)
  if (known) return known

  try {
    const response = await fetch(`${QUOTE_URL}/${encodeURIComponent(ticker.replace(".", "-"))}?range=1d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86_400 },
    })
    if (!response.ok) return ticker

    const [{ meta }] = metaSchema.parse(await response.json()).chart.result
    const exchange = EXCHANGES[meta.exchangeName]
    const symbol = exchange ? `${exchange}:${ticker}` : ticker

    found.set(ticker, symbol)
    return symbol
  } catch {
    return ticker
  }
}
