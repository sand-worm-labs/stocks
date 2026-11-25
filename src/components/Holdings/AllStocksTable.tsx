import { AppLink } from "@/components/AppLink/AppLink"
import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { ALLOCATION_FILLS } from "@/constants/cards"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import type { StockRow } from "@/lib/holdings/groups"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

export function AllStocksTable({ stocks }: { stocks: StockRow[] }) {
  if (!stocks.length) return <p className="text-ink-400 py-8 text-center">No stock you hold matches.</p>

  return (
    <Card className="px-2 py-2">
      <ul>
        {stocks.map(({ symbol, name, value, share, gain, gainRate, models }) => (
          <li key={symbol}>
            <AppLink
              route="stock"
              slug={symbol}
              className={cn("flex items-center gap-3 px-3 py-3", listItemHoverClassName)}
            >
              <StockAvatar symbol={symbol} className="size-10" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{symbol}</span>
                <span className="text-ink-400 truncate text-sm">{name}</span>
              </span>
              <span className="hidden items-center gap-1.5 md:flex" title={models.map(({ name }) => name).join(", ")}>
                <span className="flex -space-x-1">
                  {models.map(({ id, index }) => (
                    <span
                      key={id}
                      aria-hidden="true"
                      className={cn(
                        "ring-block-surface size-3.5 rounded-full ring-2",
                        ALLOCATION_FILLS[index % ALLOCATION_FILLS.length]
                      )}
                    />
                  ))}
                </span>
                <span className="text-ink-400 text-sm">
                  {models.length === 1 ? (models[0]?.name ?? "") : `${models.length} strategies`}
                </span>
              </span>
              <span className="text-ink-400 hidden w-14 text-right text-sm tabular-nums md:block">
                {formatPercent(share)}
              </span>
              <span className="flex w-32 flex-col items-end">
                <Money value={value} />
                <span className={cn("text-sm tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gain)])}>
                  <Money value={gain} signed /> · {formatPercent(gainRate, { signed: true })}
                </span>
              </span>
            </AppLink>
          </li>
        ))}
      </ul>
    </Card>
  )
}
