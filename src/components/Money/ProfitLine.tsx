import { PiTrendDown, PiTrendUp } from "react-icons/pi"

import { Money } from "@/components/Money/Money"
import { Badge } from "@/components/ui/badge"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent } from "@/lib/format"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

type ProfitLineProps = { profit: number; put: number; className?: string }

// What has been made, said as it is: the share of what was put in, the amount, and what both are measured against
export function ProfitLine({ profit, put, className }: ProfitLineProps) {
  const tone = changeTone(profit)
  const Trend = profit >= 0 ? PiTrendUp : PiTrendDown

  return (
    <span className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm", className)}>
      <Badge tone={tone} className="gap-1 text-sm">
        <Trend aria-hidden="true" size={14} />
        {formatPercent(put ? profit / put : 0, { signed: true })}
      </Badge>
      <Money value={profit} signed className={cn("font-medium", TONE_TEXT_CLASSNAME[tone])} />
      <span className="text-ink-400">
        {put ? `${profit < 0 ? "loss" : "profit"} on ${formatAmount(put)} USDC put in` : "nothing put in yet"}
      </span>
    </span>
  )
}
