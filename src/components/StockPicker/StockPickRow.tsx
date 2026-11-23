import { Money } from "@/components/Money/Money"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { CardRow } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Stock } from "@/lib/markets/types"

type StockPickRowProps = {
  stock: Stock
  checked: boolean
  onToggle: () => void
  // The picked category that already brings this stock in, which then can't be picked or dropped on its own
  includedWith?: string
}

export function StockPickRow({
  stock: { symbol, name, price = 0, liquidity = 0 },
  checked,
  onToggle,
  includedWith,
}: StockPickRowProps) {
  return (
    <CardRow>
      <label className="hover:bg-hover-bg dark:hover:bg-sidebar-hover flex cursor-pointer items-center gap-3 p-3 transition-colors duration-200">
        <StockAvatar symbol={symbol} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-ink-400 text-xs">{symbol}</span>
        </span>
        <span className="flex flex-col items-end text-sm">
          <Money value={price} />
          <span className="text-ink-400 text-xs">
            <Money value={liquidity} compact /> liq.
          </span>
        </span>
        {includedWith && <span className="text-ink-400 hidden text-xs sm:inline">Included with {includedWith}</span>}
        <Checkbox checked={checked} disabled={!!includedWith} onChange={onToggle} aria-label={`Pick ${name}`} />
      </label>
    </CardRow>
  )
}
