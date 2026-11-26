import { fromMarket } from "@/lib/api/market"

// A bare ticker like META is a different thing on other exchanges, and the chart takes the first it finds. Knowing the
// exchange that lists the share makes it NASDAQ:META.
export async function getChartSymbol(ticker: string): Promise<string> {
  const { symbol } = await fromMarket(`/market/chart-symbol/${encodeURIComponent(ticker)}`, { symbol: ticker })
  return symbol
}
