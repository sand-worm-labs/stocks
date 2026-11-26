import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/types/report"

import { ReportSection } from "../ReportSection"

export function AllocationSection({ report: { changed, allocation } }: { report: Report }) {
  return (
    <ReportSection title="What changed?" notebook={false}>
      <p className="text-sm">{changed}</p>
      <ul className="flex flex-wrap gap-2">
        {allocation.map(({ symbol, weight }) => (
          <li
            key={symbol}
            className="border-border dark:border-border-tertiary flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm"
          >
            <StockAvatar symbol={symbol === "USDC" ? "$" : symbol} className="size-6" />
            {symbol} {formatPercent(weight)}
          </li>
        ))}
      </ul>
    </ReportSection>
  )
}
