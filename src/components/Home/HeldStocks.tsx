import { AppLink } from "@/components/AppLink/AppLink"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Sparkline } from "@/components/Sparkline/Sparkline"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card, CardRow } from "@/components/ui/card"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatCompactUsd, formatUsd } from "@/lib/format"
import type { Stock } from "@/lib/markets/types"
import { changeTone } from "@/lib/tone"

export function HeldStocks({ stocks }: { stocks: Stock[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Stocks you hold" link={{ route: "markets", label: "Markets →" }} />
      <Card>
        {stocks.map(({ symbol, price = 0, liquidity = 0, series = [] }) => (
          <CardRow key={symbol}>
            <AppLink route="stock" slug={symbol} className="flex items-center gap-3 p-4">
              <StockAvatar symbol={symbol} />
              <span className="flex-1 font-medium">{symbol}</span>
              <Sparkline
                series={series}
                className={TONE_TEXT_CLASSNAME[changeTone((series.at(-1) ?? 0) - (series[0] ?? 0))]}
              />
              <span className="flex w-24 flex-col items-end">
                <span className="tabular-nums">{formatUsd(price)}</span>
                <span className="text-ink-400 text-xs">{formatCompactUsd(liquidity)} liq.</span>
              </span>
            </AppLink>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
