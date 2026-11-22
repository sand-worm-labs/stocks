import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"

import { ReportSection } from "../ReportSection"

export function ConcentrationSection({ concentration }: { concentration: Report["concentration"] }) {
  return (
    <ReportSection title="Is it one hidden bet?" term="Concentration">
      <p className="text-sm">
        Mostly, yes. You hold 4 names, but they move together. NVIDIA and Tesla carry two-thirds of the risk with 40% of
        the money.
      </p>
      <ul className="flex flex-col gap-2">
        {concentration.map(({ symbol, weight, risk }) => (
          <li key={symbol} className="flex items-center gap-3 text-sm">
            <StockAvatar symbol={symbol} className="size-6" />
            <span className="w-16 font-medium">{symbol}</span>
            <span className="text-ink-400 w-12 tabular-nums">{formatPercent(weight)}</span>
            <span className="bg-inputBg h-2 flex-1 overflow-hidden rounded-full dark:bg-white/10">
              <span className="bg-primary block h-full rounded-full" style={{ width: `${risk * 100}%` }} />
            </span>
            <span className="w-10 text-right tabular-nums">{formatPercent(risk)}</span>
          </li>
        ))}
      </ul>
      <p className="text-ink-400 text-xs">
        Share of the risk. One shared factor (big tech) explains 78% of how these stocks move.
      </p>
    </ReportSection>
  )
}
