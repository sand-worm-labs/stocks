import { AppLink } from "@/components/AppLink/AppLink"
import { Card } from "@/components/ui/card"
import { formatCompactUsd, formatUsd } from "@/lib/format"
import { type BaseToken, marketHighlights } from "@/lib/markets/tokens"
import { cn } from "@/lib/utils"

import { Change } from "./Change"
import { TokenAvatar } from "./TokenAvatar"

function Highlight({
  title,
  emoji,
  tint,
  tokens,
  stat,
}: {
  title: string
  // The mark a market list puts beside a heading like this
  emoji: string
  tint: string
  tokens: BaseToken[]
  stat: (token: BaseToken) => React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden="true" className={cn("flex size-7 items-center justify-center rounded-lg text-base", tint)}>
          {emoji}
        </span>
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {tokens.map((token) => (
          <li key={token.id}>
            <AppLink
              route="stock"
              slug={token.id}
              className="hover:bg-inputBg -mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-sm transition-colors dark:hover:bg-white/10"
            >
              <TokenAvatar image={token.image} symbol={token.symbol} className="size-7" />
              <span className="min-w-0 flex-1 truncate font-medium">{token.symbol}</span>
              <span className="text-ink-400 tabular-nums">{formatUsd(token.price)}</span>
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
        emoji="🚀"
        tint="bg-emerald-500/10"
        tokens={gainers}
        stat={({ change24h }) => <Change value={change24h} />}
      />
      <Highlight
        title="Biggest drops, 24h"
        emoji="📉"
        tint="bg-red-500/10"
        tokens={losers}
        stat={({ change24h }) => <Change value={change24h} />}
      />
      <Highlight
        title="Most traded, 24h"
        emoji="🔥"
        tint="bg-orange-500/10"
        tokens={mostTraded}
        stat={({ volume }) => <span className="tabular-nums">{formatCompactUsd(volume ?? 0)}</span>}
      />
    </div>
  )
}
