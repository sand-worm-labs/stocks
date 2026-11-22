import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"

import { ReportSection, SectionIntro } from "../ReportSection"

// A stock carrying this much of the risk is drawn as the problem
const HEAVY = 0.25
// The risk bars are drawn out of this, so the largest doesn't fill the row
const BAR_SCALE = 0.4

const ROW =
  "grid grid-cols-[84px_44px_minmax(0,1fr)_40px] items-center gap-2.5 sm:grid-cols-[100px_52px_minmax(0,1fr)_44px]"

export function ConcentrationSection({ concentration }: { concentration: Report["concentration"] }) {
  return (
    <ReportSection title="Concentration">
      <SectionIntro>
        Mostly, yes. You hold 4 names, but they move together. NVIDIA and Tesla carry two-thirds of the risk with 40% of
        the money.
      </SectionIntro>
      <div>
        <div className={cn(ROW, "text-ink-400 pb-1.5 text-xs")}>
          <span>Stock</span>
          <span className="text-right">Money</span>
          <span>Share of the risk</span>
          <span />
        </div>
        {concentration.map(({ symbol, weight, risk }, i) => (
          <div
            key={symbol}
            className={cn(ROW, "border-border-secondary dark:border-border-tertiary border-t py-2 text-[13px]")}
          >
            <span className="flex items-center gap-2 text-xs">
              <StockAvatar symbol={symbol === "USDC" ? "$" : symbol} className="size-5" />
              {symbol}
            </span>
            <span className="text-ink-200 text-right tabular-nums">{formatPercent(weight)}</span>
            <span className="bg-hover-bg h-2.5 overflow-hidden rounded-[5px] dark:bg-white/10">
              <span
                style={{ width: `${(risk / BAR_SCALE) * 100}%`, "--index": i } as React.CSSProperties}
                className={cn("animate-grow-x block h-full rounded-[5px]", risk >= HEAVY ? "bg-red-700" : "bg-link")}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{formatPercent(risk)}</span>
          </div>
        ))}
      </div>
      <p className="text-ink-400 text-xs">One shared factor (big tech) explains 78% of how these stocks move.</p>
    </ReportSection>
  )
}
