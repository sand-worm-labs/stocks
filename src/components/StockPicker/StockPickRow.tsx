import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { CardRow } from "@/components/ui/card"
import { formatCompactUsd, formatUsd } from "@/lib/format"
import type { Stock } from "@/lib/markets/types"

type StockPickRowProps = { stock: Stock; picked: boolean; includedWith?: string }

export function StockPickRow({
  stock: { symbol, name, price = 0, liquidity = 0 },
  picked,
  includedWith,
}: StockPickRowProps) {
  return (
    <CardRow>
      <label className="hover:bg-inputBg flex cursor-pointer items-center gap-3 p-3 transition-colors dark:hover:bg-white/5">
        <StockAvatar symbol={symbol} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-ink-400 text-xs">{symbol}</span>
        </span>
        <span className="flex flex-col items-end text-sm">
          <span className="tabular-nums">{formatUsd(price)}</span>
          <span className="text-ink-400 text-xs">{formatCompactUsd(liquidity)} liq.</span>
        </span>
        {includedWith && <span className="text-ink-400 hidden text-xs sm:inline">Included with {includedWith}</span>}
        <input type="checkbox" defaultChecked={picked} aria-label={`Pick ${name}`} className="accent-primary size-4" />
      </label>
    </CardRow>
  )
}
