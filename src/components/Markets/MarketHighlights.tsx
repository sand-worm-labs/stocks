import type { IconType } from "react-icons"
import { PiFire, PiTrendDown, PiTrendUp } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { Money } from "@/components/Money/Money"
import { Card } from "@/components/ui/card"

import { type BaseToken, marketHighlights } from "@/lib/markets/tokens"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

import { Change } from "./Change"
import { TokenAvatar } from "./TokenAvatar"

function Highlight({
  title,
  icon: Icon,
  tint,
  tokens,
  stat,
}: {
  title: string
  icon: IconType
  tint: string
  tokens: BaseToken[]
  stat: (token: BaseToken) => React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden="true" className={cn("flex size-7 items-center justify-center rounded-lg border", tint)}>
          <Icon size={16} />
        </span>
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {tokens.map((token) => (
          <li key={token.id}>
            <AppLink
              route="stock"
              slug={token.id}
              className={cn("-mx-2 flex items-center gap-3 px-2 py-1.5 text-sm", listItemHoverClassName)}
            >
              <TokenAvatar image={token.image} symbol={token.symbol} className="size-7" />
              <span className="min-w-0 flex-1 truncate font-medium">{token.symbol}</span>
              <span className="text-ink-400 tabular-nums">
                <Money value={token.price} />
              </span>
              <span className="min-w-16 text-right">{stat(token)}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function MarketHighlights({ tokens }: { tokens: BaseToken[] }) {
  const { gainers, losers, mostTraded } = marketHighlights(tokens)

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Highlight
        title="Top gainers, 24h"
        icon={PiTrendUp}
        tint="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        tokens={gainers}
        stat={({ change24h }) => <Change value={change24h} />}
      />
      <Highlight
        title="Biggest drops, 24h"
        icon={PiTrendDown}
        tint="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
        tokens={losers}
        stat={({ change24h }) => <Change value={change24h} />}
      />
      <Highlight
        title="Most traded, 24h"
        icon={PiFire}
        tint="border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
        tokens={mostTraded}
        stat={({ volume }) => <Money value={volume ?? 0} compact />}
      />
    </div>
  )
}
