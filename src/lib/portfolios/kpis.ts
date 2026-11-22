import { formatAmount, formatPercent, formatSignedAmount } from "@/lib/format"
import type { Kpi } from "@/lib/home/types"
import { changeTone } from "@/lib/tone"

import { portfolioValue } from "./portfolio"
import type { Portfolio } from "./types"

// The four figures at the top of a live portfolio
export function portfolioKpis(portfolio: Portfolio): Kpi[] {
  const value = portfolioValue(portfolio) ?? 0
  const invested = portfolio.holdings.reduce((sum, { cost }) => sum + cost, portfolio.cash)
  const best = portfolio.holdings.toSorted((a, b) => b.value / b.cost - a.value / a.cost)[0]
  const { weekChange = 0, worstDip = 0, rules } = portfolio

  return [
    { id: "value", label: "Value", value: formatAmount(value), caption: "USDC" },
    {
      id: "profit",
      label: "Profit",
      value: formatSignedAmount(value - invested),
      caption: `${formatPercent(weekChange, { signed: true })} · worst dip ${formatPercent(worstDip, { signed: true })}`,
      tone: changeTone(value - invested),
    },
    {
      id: "best",
      label: "Best",
      value: best?.symbol ?? "—",
      caption: best ? formatPercent(best.value / best.cost - 1, { signed: true }) : "",
    },
    { id: "rules", label: "Rules", value: rules ? `${rules.passing}/${rules.total}` : "—", caption: "holding" },
  ]
}
