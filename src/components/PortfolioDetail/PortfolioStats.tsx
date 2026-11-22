import { AppLink } from "@/components/AppLink/AppLink"
import { Card } from "@/components/ui/card"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import { holdPeriod, profit } from "@/lib/portfolios/performance"
import { portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

const LABEL = "text-ink-200 text-[11px] font-medium tracking-wide uppercase"
const TILE = "animate-fade-up flex flex-col gap-1 rounded-[14px] px-5 py-[18px]"

// The four figures that say how the portfolio is doing
export function PortfolioStats({ portfolio, now }: { portfolio: Portfolio; now: string }) {
  const period = holdPeriod(portfolio, now).text
  const { holdings, rules, weekChange = 0, worstDip = 0, id } = portfolio
  const gain = profit(portfolio)
  const best = holdings.toSorted((a, b) => b.value / b.cost - a.value / a.cost)[0]
  const fail = rules && rules.passing < rules.total

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className={TILE} style={{ "--index": 0 } as React.CSSProperties}>
        <span className={LABEL}>Value</span>
        <span className="flex items-center gap-2 text-[30px] leading-9 font-medium tabular-nums">
          {formatAmount(portfolioValue(portfolio) ?? 0)}
        </span>
        <span className="text-ink-400 flex items-center gap-1.5 text-[13px]">
          <UsdcMark className="size-4" />
          USDC
        </span>
      </Card>
      <Card className={TILE} style={{ "--index": 1 } as React.CSSProperties}>
        <span className={LABEL}>Profit</span>
        <span className={cn("text-[30px] leading-9 font-medium tabular-nums", TONE_TEXT_CLASSNAME[changeTone(gain)])}>
          {formatSignedAmount(gain)}
        </span>
        <span className="text-ink-400 text-[13px]">
          {formatPercent(weekChange, { signed: true })} {period} · worst dip {formatPercent(worstDip, { signed: true })}
        </span>
      </Card>
      <Card className={TILE} style={{ "--index": 2 } as React.CSSProperties}>
        <span className={LABEL}>Best</span>
        <span className="text-[30px] leading-9 font-medium">{best?.symbol ?? "—"}</span>
        <span className="text-ink-400 text-[13px]">
          {best ? `${formatPercent(best.value / best.cost - 1, { signed: true })} on what you paid` : ""}
        </span>
      </Card>
      <AppLink route="rules" slug={id} className="group contents">
        <Card
          className={cn(TILE, "group-hover:border-hover-border group-hover:bg-hover-bg transition-colors")}
          style={{ "--index": 3 } as React.CSSProperties}
        >
          <span className={LABEL}>Rules</span>
          <span
            className={cn(
              "text-[30px] leading-9 font-medium tabular-nums",
              fail ? TONE_TEXT_CLASSNAME.negative : TONE_TEXT_CLASSNAME.positive
            )}
          >
            {rules ? `${rules.passing}/${rules.total}` : "—"}
          </span>
          <span className="text-ink-400 text-[13px]">{fail ? "need a look" : "holding · checked daily"}</span>
        </Card>
      </AppLink>
    </div>
  )
}
