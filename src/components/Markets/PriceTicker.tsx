"use client"

import { memo } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import { Money } from "@/components/Money/Money"
import { SECONDS_PER_ITEM } from "@/constants/components/markets/price-ticker"
import type { BaseToken } from "@/lib/markets/tokens"

import { Change } from "./Change"
import { Flash } from "./Flash"
import { LiveBadge } from "./LiveBadge"
import { useLiveMarketContext } from "./LiveMarket"
import { TokenAvatar } from "./TokenAvatar"

type TickerToken = Pick<BaseToken, "id" | "address" | "symbol" | "image" | "price" | "change24h">

type TickerItemProps = { id: string; symbol: string; image?: string; price: number; change?: number }

// Only its own numbers can make it draw again, so a price moving somewhere else leaves it alone
const TickerItem = memo(function TickerItem({ id, symbol, image, price, change }: TickerItemProps) {
  return (
    <li className="flex-none">
      <AppLink
        route="stock"
        slug={id}
        className="hover:bg-inputBg flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs transition-colors dark:hover:bg-white/10"
      >
        <TokenAvatar image={image} symbol={symbol} className="size-4 text-[9px]" />
        <span className="font-medium">{symbol}</span>
        <Flash value={price}>
          <Money value={price} />
        </Flash>
        <Change value={change} />
      </AppLink>
    </li>
  )
})

export function PriceTicker({ tokens }: { tokens: TickerToken[] }) {
  const { quotes } = useLiveMarketContext()

  const items = tokens.map(({ id, address, symbol, image, price, change24h }) => {
    const quote = quotes[address.toLowerCase()]
    return {
      id,
      symbol,
      image,
      price: quote?.price ?? price,
      change: quote?.change24h === undefined ? change24h : quote.change24h / 100,
    }
  })

  return (
    <div
      aria-label="Prices"
      className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-9 items-center border-b"
    >
      <div className="border-border-secondary dark:border-border-tertiary flex-none border-r px-3">
        <LiveBadge compact />
      </div>
      <div className="group relative min-w-0 flex-1 overflow-hidden py-1.5 [contain:paint]">
        <ul
          style={{ "--marquee-duration": `${tokens.length * SECONDS_PER_ITEM}s` } as React.CSSProperties}
          className="animate-marquee flex w-max group-hover:[animation-play-state:paused]"
        >
          {[0, 1].map((copy) =>
            items.map((item) => (
              <div key={`${copy}-${item.id}`} aria-hidden={copy === 1} inert={copy === 1} className="contents">
                <TickerItem {...item} />
              </div>
            ))
          )}
        </ul>
        <div
          aria-hidden="true"
          className="from-block-surface pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent"
        />
        <div
          aria-hidden="true"
          className="from-block-surface pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent"
        />
      </div>
    </div>
  )
}
