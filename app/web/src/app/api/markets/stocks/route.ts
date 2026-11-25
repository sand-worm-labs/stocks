import { respond } from "@/lib/api/respond"
import { getStocks } from "@/lib/markets/source"
import { isBuyable } from "@/lib/markets/stock"

// The stocks on offer, without their price history (a chart's worth of numbers each, which is for the page to draw)
export async function GET(request: Request) {
  return respond(request, {}, async () => {
    const stocks = await getStocks()
    return stocks.map(({ series: _series, ...stock }) => ({ ...stock, isBuyable: isBuyable(stock) }))
  })
}
