import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { formatCompactUsd } from "@/lib/format"
import type { Stock, StockCategory } from "@/lib/markets/types"

type CategoryCardProps = { category: StockCategory; buyable: Stock[]; liquidity: number; picked?: boolean }

export function CategoryCard({ category, buyable, liquidity, picked }: CategoryCardProps) {
  return (
    <Card className="has-[:checked]:border-primary has-[:checked]:ring-primary relative p-4 has-[:checked]:ring-1">
      <label className="flex cursor-pointer flex-col gap-3">
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{category.label}</span>
          <input
            type="checkbox"
            defaultChecked={picked}
            aria-label={`Pick the whole ${category.label} category`}
            className="accent-primary size-4"
          />
        </span>
        <span className="flex -space-x-2">
          {buyable.map(({ symbol }) => (
            <StockAvatar key={symbol} symbol={symbol} className="ring-block-surface size-7 ring-2" />
          ))}
        </span>
        <span className="text-ink-400 text-xs">
          {buyable.length} buyable
          {!!category.unavailable?.length && ` · ${category.unavailable.length} not yet`} ·{" "}
          {formatCompactUsd(liquidity)} liq.
        </span>
      </label>
    </Card>
  )
}
