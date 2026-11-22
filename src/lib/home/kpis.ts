import { formatTime } from "@/lib/dates"
import { formatAmount, formatPercent, pluralize } from "@/lib/format"
import { isLive, portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"

import type { Kpi } from "./types"

const sum = (numbers: number[]) => numbers.reduce((total, n) => total + n, 0)

export function buildKpis(portfolios: Portfolio[]): Kpi[] {
  const live = portfolios.filter(isLive)
  const values = live.map((portfolio) => portfolioValue(portfolio) ?? 0)
  const total = sum(values)
  // Each portfolio counts in proportion to what it holds.
  const weekChange = total ? sum(live.map(({ weekChange = 0 }, i) => weekChange * (values[i] ?? 0))) / total : 0
  const worstDip = Math.min(0, ...live.flatMap(({ worstDip }) => worstDip ?? []))
  const rules = live.flatMap(({ rules }) => rules ?? [])
  const checkedAt = rules
    .map(({ checkedAt }) => checkedAt)
    .sort()
    .at(-1)

  return [
    {
      id: "value",
      label: "Total value",
      value: formatAmount(total),
      caption: `USDC across ${pluralize(live.length, "live portfolio")}`,
    },
    {
      id: "week",
      label: "This week",
      value: formatPercent(weekChange, { signed: true }),
      caption: `worst dip ${formatPercent(worstDip, { signed: true })}`,
      tone: changeTone(weekChange),
    },
    { id: "cash", label: "Cash", value: formatAmount(sum(live.map(({ cash }) => cash))), caption: "USDC ready to use" },
    {
      id: "rules",
      label: "Rules",
      value: `${sum(rules.map(({ passing }) => passing))}/${sum(rules.map(({ total }) => total))}`,
      caption: checkedAt ? `holding, checked ${formatTime(checkedAt)}` : "nothing to check yet",
    },
  ]
}
