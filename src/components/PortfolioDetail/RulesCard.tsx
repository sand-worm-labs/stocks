import { AppLink } from "@/components/AppLink/AppLink"
import { RulesList } from "@/components/Rules/RulesList"
import { Card } from "@/components/ui/card"
import { formatDay, formatTime } from "@/lib/dates"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Rule } from "@/lib/rules/types"

export function RulesCard({ portfolio, rules }: { portfolio: Portfolio; rules: Rule[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-medium">Your rules</h3>
        <AppLink route="rules" slug={portfolio.id} className="text-ink-400 hover:text-ink-100 text-sm font-medium">
          Edit rules
        </AppLink>
      </div>
      {portfolio.rules && (
        <p className="text-ink-400 text-sm">
          Locked {portfolio.startedAt && formatDay(portfolio.startedAt)} · checked today{" "}
          {formatTime(portfolio.rules.checkedAt)}
        </p>
      )}
      <Card>
        <RulesList rules={rules} />
      </Card>
    </section>
  )
}
