"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { Flash } from "@/components/Markets/Flash"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card, CardRow } from "@/components/ui/card"
import type { RouteId } from "@/config/routes"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent, pluralize } from "@/lib/format"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"
import type { LiveStock } from "@/types/home"

type StockListProps = { title: string; stocks: LiveStock[]; link: { route: RouteId; label: string } }

export function StockList({ title, stocks, link }: StockListProps) {
  const { quotes } = useLiveMarketContext()

  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="flex items-center gap-2.5 text-lg font-medium">
          {title}
          <span className="text-ink-400 flex items-center gap-1.5 text-xs font-normal">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </h2>
        <AppLink route={link.route} className="text-ink-400 hover:text-ink-100 text-sm font-medium transition-colors">
          {link.label}
        </AppLink>
      </div>
      <div className="px-2 pb-2">
        {stocks.map(({ symbol, name, price: listed = 0, dayChange, address, heldIn, share }, i) => {
          const pool = address ? quotes[address.toLowerCase()] : undefined
          const price = pool?.price ?? listed
          // The pool's change is in percent; the page's own is a fraction
          const change = pool?.change24h !== undefined ? pool.change24h / 100 : dayChange

          return (
            <CardRow
              key={symbol}
              className="animate-fade-up border-t-0"
              style={{ "--index": i } as React.CSSProperties}
            >
              <AppLink
                route="stock"
                slug={symbol}
                className={cn("flex items-center gap-3 px-3 py-2.5", listItemHoverClassName)}
              >
                <StockAvatar symbol={symbol} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{symbol}</span>
                  <span className="text-ink-400 truncate text-sm">{name}</span>
                  {heldIn && share !== undefined && (
                    <span className="text-ink-400 truncate text-xs">
                      In {pluralize(heldIn, "strategy")} · {formatPercent(share)} of what you hold
                    </span>
                  )}
                </span>
                <span className="flex flex-col items-end">
                  <Flash value={price}>
                    <Money value={price} />
                  </Flash>
                  {change !== undefined && (
                    <span className={`${TONE_TEXT_CLASSNAME[changeTone(change)]} text-sm tabular-nums`}>
                      {formatPercent(change, { signed: true })}
                    </span>
                  )}
                </span>
              </AppLink>
            </CardRow>
          )
        })}
      </div>
    </Card>
  )
}
