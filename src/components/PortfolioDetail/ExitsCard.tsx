import { SellDialog } from "@/components/PortfolioDetail/SellDialog"
import { RuleLine, StepLine } from "@/components/Strategy/RuleLines"
import { Card } from "@/components/ui/card"
import { isExitRule } from "@/lib/rules/readings"
import { explainStrategy } from "@/lib/strategy/explain"
import type { Portfolio } from "@/types/portfolios"
import type { Rule } from "@/types/rules"
import type { Strategy } from "@/types/strategy"

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
