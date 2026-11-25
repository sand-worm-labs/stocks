import { PiShieldCheck } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { StrategyWorkbench } from "@/components/Strategy/StrategyWorkbench"
import { Card } from "@/components/ui/card"
import { EmptyResults } from "@/components/ui/empty-results"
import { formatActivityTime } from "@/lib/dates"
import type { ModelDoc } from "@/lib/strategy/document"
import type { Activity } from "@/types/activity"
import type { Stock } from "@/types/markets"
import type { Portfolio } from "@/types/portfolios"
import type { StrategyRow } from "@/types/rules"

type LiveRulesProps = {
  portfolio: Portfolio
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
  doc: ModelDoc
  strategy: StrategyRow[]
  checks: Activity[]
  now: string
}

export function LiveRules({ portfolio, stocks, doc, strategy, checks, now }: LiveRulesProps) {
  const { id } = portfolio

  return (
    <div className="flex flex-col gap-4">
      <StrategyWorkbench portfolio={portfolio} stocks={stocks} initial={doc} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2 rounded-[14px] p-4 md:px-6 md:py-5">
          <h3 className="text-[17px] font-medium">Your idea</h3>
          <dl>
            {strategy.map(({ label, value }) => (
              <div
                key={label}
                className="border-border-secondary dark:border-border-tertiary flex justify-between gap-3 border-t py-2 text-[13px] first:border-t-0"
              >
                <dt className="text-ink-200">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="flex flex-col gap-2 rounded-[14px] p-4 md:px-6 md:py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-medium">Recent checks</h3>
            <AppLink
              route="portfolioActivity"
              slug={id}
              query={{ filter: "agent" }}
              className="text-accent dark:text-primary text-xs hover:underline"
            >
              All checks
            </AppLink>
          </div>
          {!checks.length && (
            <EmptyResults
              icon={PiShieldCheck}
              title="No checks yet"
              hint="The agent's checks against your rules will show up here."
              className="flex-1 py-8"
            />
          )}
          <ul>
            {checks.map(({ id: checkId, title, detail, at }) => (
              <li
                key={checkId}
                className="border-border-secondary dark:border-border-tertiary flex flex-col gap-0.5 border-t py-2 text-[13px] first:border-t-0"
              >
                <span className="flex justify-between gap-3">
                  <span className="font-medium">{title}</span>
                  <span className="text-ink-400 text-xs">{formatActivityTime(at, now)}</span>
                </span>
                <span className="text-ink-400 text-xs">{detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
