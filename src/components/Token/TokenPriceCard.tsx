import { LineChart } from "@/components/LineChart/LineChart"
import { TradingViewChart } from "@/components/TradingViewChart/TradingViewChart"
import { shareTicker } from "@/lib/markets/share"
import type { BaseToken } from "@/lib/markets/tokens"

import { TokenCharts } from "./TokenCharts"

// The token's own chart, and TradingView's chart of the share where there is one, or the token's week where there isn't
// `chartSymbol` is the share's ticker with its exchange, so the chart finds the right company
export function TokenPriceCard({ token, chartSymbol }: { token: BaseToken; chartSymbol?: string }) {
  const { address, symbol, series, change7d } = token
  const ticker = shareTicker(token)

  return (
    <TokenCharts
      address={address}
      symbol={symbol}
      other={
        ticker
          ? {
              label: `${ticker} share`,
              note: `${ticker}, the share ${symbol} tracks. Market data from TradingView.`,
              chart: (
                <TradingViewChart
                  symbol={chartSymbol ?? ticker}
                  label={`${ticker} share price chart`}
                  className="px-2 pb-3 md:px-3"
                />
              ),
            }
          : {
              label: "Last 7 days",
              note: `${symbol} on Base. There is no chart of the share for this one.`,
              chart: (
                <div className="p-4 md:p-6">
                  <LineChart
                    label={`${symbol} price over the last 7 days`}
                    lines={[
                      {
                        id: "token",
                        points: series,
                        className: (change7d ?? 0) < 0 ? "text-red-600" : "text-emerald-600",
                      },
                    ]}
                    className="h-72"
                  />
                </div>
              ),
            }
      }
    />
  )
}
