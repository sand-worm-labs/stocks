import { AppLink } from "@/components/AppLink/AppLink"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import type { Stock } from "@/lib/markets/types"

export function StockShortcuts({ stocks, total }: { stocks: Stock[]; total: number }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink-400 text-sm font-medium">Or build around a stock</h2>
      <div className="flex flex-wrap gap-2">
        {stocks.map(({ symbol }) => (
          <AppLink
            key={symbol}
            route="stockPicker"
            className="border-border hover:border-primary dark:border-border-tertiary flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition-colors"
          >
            <StockAvatar symbol={symbol} className="size-6" />
            {symbol}
          </AppLink>
        ))}
        <AppLink route="markets" className="text-ink-400 hover:text-ink-100 flex items-center px-2 text-sm font-medium">
          Browse all {total} →
        </AppLink>
      </div>
    </section>
  )
}
