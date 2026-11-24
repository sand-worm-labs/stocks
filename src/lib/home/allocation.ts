import { deposited, profit, returnOnDeposit } from "@/lib/portfolios/performance"
import { isLive, portfolioValue, rankByValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"

// `index` is the model's rank by value, so it has the same colour on every page; cash and the rest have none.
// `change` is the way it is going: what it has gained on what was put in, as a fraction; cash has none.
export type AllocationSlice = { id: string; label: string; value: number; index?: number; change?: number }

export const OTHER_MODELS_ID = "other"

// How many models are drawn one by one before the rest are drawn together
const SHOWN_MODELS = 5

const stocksIn = (portfolio: Portfolio) => (portfolioValue(portfolio) ?? 0) - portfolio.cash

// Where the money is: what the biggest models hold, the rest of them together, and the cash waiting in them all
export function buildAllocation(portfolios: Portfolio[]): AllocationSlice[] {
  const ranked = rankByValue(portfolios)
  const top = ranked.slice(0, SHOWN_MODELS).map((portfolio, index) => ({
    id: portfolio.id,
    label: portfolio.name,
    value: stocksIn(portfolio),
    index,
    change: returnOnDeposit(portfolio),
  }))
  const rest = ranked.slice(SHOWN_MODELS)
  const restPut = rest.reduce((sum, portfolio) => sum + deposited(portfolio), 0)
  const others = rest.length
    ? [
        {
          id: OTHER_MODELS_ID,
          label: `${rest.length} other ${rest.length === 1 ? "strategy" : "strategies"}`,
          value: rest.reduce((sum, portfolio) => sum + stocksIn(portfolio), 0),
          // Together, as one: all they have gained over all that was put into them
          change: restPut ? rest.reduce((sum, portfolio) => sum + profit(portfolio), 0) / restPut : 0,
        },
      ]
    : []
  const cash = portfolios.filter(isLive).reduce((sum, { cash }) => sum + cash, 0)

  return [...top, ...others, ...(cash > 0 ? [{ id: "cash", label: "Cash (USDC)", value: cash }] : [])]
}
