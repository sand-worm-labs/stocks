import { formatAmount, formatPercent, formatSignedAmount, pluralize } from "@/lib/format"
import { deposited } from "@/lib/portfolios/performance"
import { isLive, portfolioValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"
import { changeTone } from "@/lib/tone"

import type { Kpi } from "./types"

const sum = (numbers: number[]) => numbers.reduce((total, n) => total + n, 0)

export function buildKpis(portfolios: Portfolio[]): Kpi[] {
  const live = portfolios.filter(isLive)
  const values = live.map((portfolio) => portfolioValue(portfolio) ?? 0)
  const total = sum(values)
  const put = sum(live.map(deposited))
  const profit = total - put
  const cash = sum(live.map((portfolio) => portfolio.cash))

  return [
    {
      id: "value",
      label: "Total value",
      value: formatAmount(total),
      amount: total,
      caption: `USDC across ${pluralize(live.length, "live strategy")}`,
    },
    {
      id: "deposited",
      label: "Invested",
      value: formatAmount(put),
      amount: put,
      caption: "USDC you put in",
    },
    {
      id: "profit",
      label: "Profit",
      value: formatSignedAmount(profit),
      amount: profit,
      caption: put ? `${formatPercent(profit / put, { signed: true })} on what you put in` : "nothing put in yet",
      tone: changeTone(profit),
    },
    {
      id: "inStocks",
      label: "In stocks",
      value: formatAmount(total - cash),
      amount: total - cash,
      caption: "USDC, at today's prices",
    },
    { id: "cash", label: "Cash ready", value: formatAmount(cash), amount: cash, caption: "USDC to buy with" },
  ]
}
