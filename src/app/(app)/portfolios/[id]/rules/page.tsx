import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { AgentPanel } from "@/components/Flow/AgentPanel"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { RulesList } from "@/components/Rules/RulesList"
import { Card, CardRow } from "@/components/ui/card"
import { getPortfolio } from "@/lib/portfolios/source"
import { getRules } from "@/lib/rules/source"

export const metadata: Metadata = { title: "Rules" }

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const portfolio = await getPortfolio((await params).id)
  if (!portfolio) notFound()

  const { rules, strategy, assumption } = await getRules(portfolio)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="rules" portfolioId={portfolio.id} />}
        aside={
          <AgentPanel brief={portfolio.brief}>
            <p className="text-sm">
              Here&apos;s your brief as a strategy and rules. The rules lock when you confirm; your −20% becomes a test
              the backtest has to pass.
            </p>
          </AgentPanel>
        }
      >
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Strategy</h2>
          <Card>
            {strategy.map(({ label, term, value }) => (
              <CardRow key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="flex flex-col">
                  <span className="text-ink-400">{label}</span>
                  {term && <span className="text-ink-300 text-xs">{term}</span>}
                </span>
                <span className="font-medium">{value}</span>
              </CardRow>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">Your rules</h2>
            <span className="text-ink-400 text-sm">Locks on confirm</span>
          </div>
          <Card>
            <RulesList rules={rules} />
          </Card>
        </section>

        <p className="text-sm">
          <span className="text-ink-400 font-medium">I assumed </span>
          {assumption}
        </p>

        <div className="flex flex-wrap gap-2">
          <AppLink route="research" slug={portfolio.id} className={buttonVariants({ intent: "dark", size: "compact" })}>
            Confirm &amp; research
          </AppLink>
          <button type="button" className={buttonVariants({ intent: "outline", size: "compact" })}>
            Edit
          </button>
        </div>
      </FlowLayout>
    </div>
  )
}
