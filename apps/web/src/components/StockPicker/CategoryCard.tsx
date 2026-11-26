import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Stock, StockCategory } from "@/types/markets"

type CategoryCardProps = {
  category: StockCategory
  buyable: Stock[]
  liquidity: number
  checked: boolean
  onToggle: () => void
}

export function CategoryCard({ category, buyable, liquidity, checked, onToggle }: CategoryCardProps) {
  return (
    <Card
      className={cn(
        "relative p-4 transition-[border-color,box-shadow,background-color] duration-200",
        checked && "border-primary ring-primary bg-primary/[0.03] dark:bg-primary/[0.06] ring-1"
      )}
    >
      <label className="flex cursor-pointer flex-col gap-3">
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{category.label}</span>
          <Checkbox checked={checked} onChange={onToggle} aria-label={`Pick the whole ${category.label} category`} />
        </span>
        <span className="flex -space-x-2">
          {buyable.map(({ symbol }) => (
            <StockAvatar key={symbol} symbol={symbol} className="ring-block-surface size-7 ring-2" />
          ))}
        </span>
        <span className="text-ink-400 text-xs">
          {buyable.length} buyable
          {!!category.unavailable?.length && ` · ${category.unavailable.length} not yet`} ·{" "}
          <Money value={liquidity} compact /> liq.
        </span>
      </label>
    </Card>
  )
}
