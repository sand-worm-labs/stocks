import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { RuleLine, StepLine } from "@/components/Strategy/RuleLines"
import { Card } from "@/components/ui/card"
import type { Portfolio } from "@/lib/portfolios/types"
import { isExitRule } from "@/lib/rules/readings"
import type { Rule } from "@/lib/rules/types"
import { explainStrategy } from "@/lib/strategy/explain"
import type { Strategy } from "@/lib/strategy/types"

// How the strategy gets out of a stock, in the same lines as the Rules tab: the stop-loss and take-profit it was given, and the
// rebalance that keeps what it holds on target. Limits (budget, most in one stock, and the like) are not exits and stay on the
// Rules tab. Each line is read from the strategy's own rules, so a strategy with no stop-loss shows none.
export function ExitsCard({ portfolio, rules, strategy }: { portfolio: Portfolio; rules: Rule[]; strategy: Strategy }) {
  const exits = rules.filter(isExitRule)
  const [first] = explainStrategy(strategy).steps
  const rebalance = first?.kind === "keep" && first.depth === 0 ? first : undefined

  return (
    <Card className="flex flex-col gap-3 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <h3 className="text-[17px] font-medium">How and when you get out.</h3>
      {exits.length || rebalance ? (
        <ul>
          {exits.map((rule) => (
            <RuleLine key={rule.id} rule={rule} />
          ))}
          {rebalance && <StepLine step={rebalance} standalone />}
        </ul>
      ) : (
        <p className="text-ink-400 text-sm">
          No stop-loss or take-profit is set. It only sells a stock when its own rules say to.
        </p>
      )}
      <SellDialog portfolio={portfolio} className="mt-1 self-start" />
    </Card>
  )
}
