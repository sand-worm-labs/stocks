"use client"

import { AppLink } from "@/components/AppLink/AppLink"
import { formatUsd } from "@/lib/format"
import type { BaseToken } from "@/lib/markets/tokens"

import { Change } from "./Change"
import { Flash } from "./Flash"
import { LiveBadge } from "./LiveBadge"
import { useLiveMarketContext } from "./LiveMarket"
import { TokenAvatar } from "./TokenAvatar"

type TickerToken = Pick<BaseToken, "id" | "address" | "symbol" | "image" | "price" | "change24h">

const SECONDS_PER_ITEM = 3

function TickerItem({ token: { id, address, symbol, image, price, change24h } }: { token: TickerToken }) {
  const { quotes } = useLiveMarketContext()
  const quote = quotes[address.toLowerCase()]
  const live = quote?.price ?? price
  const change = quote?.change24h === undefined ? change24h : quote.change24h / 100

  return (
    <li className="flex-none">
      <AppLink
        route="stock"
        slug={id}
        className="hover:bg-inputBg flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs transition-colors dark:hover:bg-white/10"
      >
        <TokenAvatar image={image} symbol={symbol} className="size-4 text-[9px]" />
        <span className="font-medium">{symbol}</span>
        <Flash value={live}>
          <span className="tabular-nums">{formatUsd(live)}</span>
        </Flash>
        <Change value={change} />
      </AppLink>
    </li>
  )
}

// A tape of prices running along under the header, the way a trading screen has one, with the state of the connection
// pinned at its left end
export function PriceTicker({ tokens }: { tokens: TickerToken[] }) {
  return (
    <div
      aria-label="Prices"
      className="border-border-secondary bg-block-surface dark:border-border-tertiary flex items-center border-b"
    >
      <div className="border-border-secondary dark:border-border-tertiary flex-none border-r px-3">
        <LiveBadge compact />
      </div>
      <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] py-2">
        <ul
          style={{ "--marquee-duration": `${tokens.length * SECONDS_PER_ITEM}s` } as React.CSSProperties}
          className="animate-marquee flex w-max group-hover:[animation-play-state:paused]"
        >
          {[0, 1].map((copy) =>
            tokens.map((token) => (
              <div key={`${copy}-${token.id}`} aria-hidden={copy === 1} inert={copy === 1} className="contents">
                <TickerItem token={token} />
              </div>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
