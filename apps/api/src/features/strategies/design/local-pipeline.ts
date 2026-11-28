import { analyzeBrief } from "@/features/strategies/brief/analyze"
import { ideaCoverage, namedBy } from "@/features/strategies/brief/idea-coverage"
import { isBuyable } from "@/features/market/stock"
import { spreadAcrossSectors } from "@/features/market/matching/market-pack"
import { findStocks } from "@/features/market/matching/find-stocks"
import { generatedName } from "./strategy-name"
import type { RuleSpec } from "@/features/strategies/rules/spec"
import type { Stock } from "@/features/market/types/market.types"
import type { Design, Market, Pipeline, Research } from "./pipeline.types"
import type { Report } from "@/features/research/types/report.types"
import type { Strategy } from "@/features/strategies/types/strategy.types"

const DEFAULT_BUDGET = 500
const DEFAULT_LOSS_LIMIT = 25
const DEFAULT_MAX_SHARE = 0.35
const DEFAULT_LIQUIDITY = 100_000
const MOST_STOCKS = 6
const STOP_PAUSE_DAYS = 63

function named(items: string[], market: Market) {
  return items.flatMap((item) => findStocks(item, market).map(({ symbol }) => symbol))
}

// Only stocks whose pool holds at least `minLiquidity` are taken: the strategy has a rule that it won't trade thinner ones, so picking one would
// make a strategy that breaks its own rule on the first day
export function pickStocks(include: string[], avoid: string[], market: Market, maxShare: number, minLiquidity = 0) {
  const buyable = market.stocks.filter((stock) => isBuyable(stock) && (stock.liquidity ?? 0) >= minLiquidity)
  const byLiquidity = (a: Stock, b: Stock) => (b.liquidity ?? 0) - (a.liquidity ?? 0)
  const out = new Set(named(avoid, market))
  const asked = [...new Set(named(include, market))].filter((symbol) => !out.has(symbol))
  const want = Math.min(MOST_STOCKS, Math.max(2, Math.ceil(1 / maxShare)))
  const wanted = buyable.filter(({ symbol }) => asked.includes(symbol))
  if (wanted.length) return wanted.toSorted(byLiquidity).slice(0, want)
  // Nothing the idea names can be bought on Base: a spread of the market, not its three most traded names every time
  return spreadAcrossSectors(buyable.filter(({ symbol }) => !out.has(symbol)), want)
}

export function shares(count: number, maxShare: number) {
  return Array.from({ length: count }, () => Math.min(1 / count, maxShare))
}

function designStrategy(name: string, symbols: string[]): Strategy {
  return {
    name,
    schedule: "monthly",
    root: {
      type: "rebalance",
      drift: 0.05,
      every: "weekly",
      child: {
        type: "filter",
        pick: "top",
        count: Math.min(symbols.length, 4),
        by: { kind: "return", days: 126 },
        from: symbols,
        weighting: "inverse-volatility",
        days: 60,
      },
    },
  }
}

// What the "Include" line of the summary says: what was asked for, or that nothing was and the most liquid stocks were taken
function includeText(items: string[], { basis, couldntMatch }: { basis: string; couldntMatch: string[] }) {
  if (basis === "fallback") return `The most liquid stocks (nothing on Base for ${couldntMatch.join(", ")})`
  return items.join(", ") || "The most liquid stocks"
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`
const usdc = (amount: number) => amount.toLocaleString("en-US", { maximumFractionDigits: 0 })

export { generatedName } from "./strategy-name"

export function createLocalPipeline(template: Report): Pipeline {
  return {
    async design(brief, market) {
      const { fields } = analyzeBrief(brief)
      const budget = fields.budget?.value ?? DEFAULT_BUDGET
      const maxShare = fields.maxPerStock ? fields.maxPerStock.value / 100 : DEFAULT_MAX_SHARE
      const loss = fields.loss?.value ?? DEFAULT_LOSS_LIMIT
      // What the idea is about is read the same way for the picks and for the coverage notice, so they agree on it
      const picked = pickStocks(namedBy(brief), fields.avoid.items, market, maxShare, fields.minLiquidity ?? DEFAULT_LIQUIDITY)
      const name = generatedName(brief)

      const rules: RuleSpec[] = [
        { type: "budget", amount: budget },
        { type: "max-weight", limit: maxShare },
        { type: "min-liquidity", amount: fields.minLiquidity ?? DEFAULT_LIQUIDITY },
        ...(fields.askBeforeBuying ? [{ type: "approval" } as const] : []),
        { type: "portfolio-stop", limit: loss / 100, pause: STOP_PAUSE_DAYS },
      ]
      const coverage = ideaCoverage({ brief, symbols: picked.map(({ symbol }) => symbol), market, maxShare })
      const assumed = [
        !fields.budget && `a budget of ${usdc(DEFAULT_BUDGET)} USDC`,
        !fields.maxPerStock && `no more than ${percent(DEFAULT_MAX_SHARE)} in one stock`,
        !fields.loss && `a loss limit of −${DEFAULT_LOSS_LIMIT}%`,
      ].filter(Boolean)

      return {
        name,
        rules,
        budget,
        strategy: designStrategy(
          name,
          picked.map(({ symbol }) => symbol)
        ),
        summary: [
          { label: "Goal", value: fields.goal?.value ?? "Growth" },
          { label: "Horizon", value: fields.horizon?.value ?? "3+ years" },
          { label: "Loss you can live with", term: "Max drawdown limit", value: `−${loss}%` },
          { label: "Include", value: includeText(fields.include.items, coverage) },
          { label: "Benchmark", value: "S&P 500" },
        ],
        assumption: [
          assumed.length ? `Your idea didn't say, so I assumed ${assumed.join(", ")}.` : "I read everything in your idea as written.",
          // Said plainly where the rules are read, so nobody finds out from the results that the stocks they named weren't the ones tested
          coverage.headline && `${coverage.headline}.`,
        ]
          .filter(Boolean)
          .join(" "),
      } satisfies Design
    },

    async research({ rules, strategy, budget }, market) {
      const maxShare =
        (rules.find((rule) => rule.type === "max-weight") as { limit: number } | undefined)?.limit ?? DEFAULT_MAX_SHARE
      const loss =
        (rules.find((rule) => rule.type === "portfolio-stop") as { limit: number } | undefined)?.limit ??
        DEFAULT_LOSS_LIMIT / 100
      const symbols =
        strategy.root.type === "rebalance" && strategy.root.child.type === "filter" ? strategy.root.child.from : []
      const chosen = symbols.flatMap(
        (symbol) => market.stocks.find((stock) => stock.symbol === symbol && stock.price) ?? []
      )
      const weights = shares(chosen.length, maxShare)
      const orders = chosen.map(({ symbol, price = 1, liquidity = 1 }, i) => {
        const spend = budget * (weights[i] ?? 0)
        return { symbol, spend, receive: spend / price, impact: Math.min(spend / liquidity, 0.05) }
      })
      const invested = orders.reduce((sum, { spend }) => sum + spend, 0)
      const cash = budget - invested
      const fits = Math.abs(template.tolerance.worst) <= loss

      const report: Report = {
        ...template,
        preview: true,
        verdict: { label: "Example results", tone: "warning" },
        headline: "Your strategy is designed and ready to review.",
        plan: `Buy ${chosen.length} stocks for ${usdc(invested)} USDC${cash > 0.5 ? ` · keep ${usdc(cash)} USDC as cash` : ""}`,
        allocation: [
          ...chosen.map(({ symbol }, i) => ({ symbol, weight: weights[i] ?? 0 })),
          ...(cash > 0.5 ? [{ symbol: "USDC", weight: cash / budget }] : []),
        ],
        summary: [
          `${usdc(invested)} USDC across ${chosen.map(({ symbol }) => symbol.replace(/c$/, "")).join(", ")}${cash > 0.5 ? `; ${usdc(cash)} USDC stays as cash` : ""}.`,
          "The growth, worst drop and other figures below are an example, not a test of this strategy.",
          fits
            ? `Its example worst drop is inside the −${Math.round(loss * 100)}% you said you could live with.`
            : `Its example worst drop is past the −${Math.round(loss * 100)}% you said you'd panic at.`,
        ],
        tolerance: {
          panic: -loss,
          worst: template.tolerance.worst,
          fits,
          text: fits ? "Yes, on the example numbers." : "No, on the example numbers.",
        },
        concentration: chosen.map(({ symbol }, i) => ({ symbol, weight: weights[i] ?? 0, risk: weights[i] ?? 0 })),
        liquidity: chosen.map(({ symbol, liquidity = 0 }, i) => ({
          symbol,
          token: liquidity,
          share: liquidity ? (orders[i]?.spend ?? 0) / liquidity : 0,
        })),
        research: chosen.map(({ symbol, name: company }) => ({
          symbol,
          text: `${company} was picked from your idea. The agent hasn't researched it yet.`,
          label: "Assumption" as const,
        })),
      }
      return { report, orders } satisfies Research
    },
  }
}
