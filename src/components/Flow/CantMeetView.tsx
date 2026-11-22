import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { AgentPanel } from "@/components/Flow/AgentPanel"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { PortfolioBreadcrumb } from "@/components/Flow/PortfolioBreadcrumb"
import { StepProgress } from "@/components/Flow/StepProgress"
import { ReportSection } from "@/components/Report/ReportSection"
import { RulesList } from "@/components/Rules/RulesList"
import { SourceLink } from "@/components/SourceLink/SourceLink"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatAsOf } from "@/lib/dates"
import { formatPercent } from "@/lib/format"
import { isBuyable } from "@/lib/markets/stock"
import type { MarketSummary, Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Rule } from "@/lib/rules/types"

const WAYS_OUT = ["4 stocks at 15%+, rest in cash", "4 stocks at 25% each", "Widen to AI and robotics"]

type CantMeetViewProps = { portfolio: Portfolio; rules: Rule[]; universe: Stock[]; summary: MarketSummary }

// A brief that can't be met is refused, with the reason and ways out. It is never turned into a portfolio that only looks like it fits.
export function CantMeetView({ portfolio, rules, universe, summary }: CantMeetViewProps) {
  const { positions, minimum } = portfolio.constraint ?? { positions: 0, minimum: 0 }
  const required = positions * minimum
  const buyable = universe.filter(isBuyable)

  return (
    <div className="flex flex-col gap-4">
      <PortfolioBreadcrumb name={portfolio.name} />
      <FlowLayout
        steps={<StepProgress current="rules" portfolioId={portfolio.id} />}
        aside={
          <AgentPanel brief={portfolio.brief}>
            <p className="text-sm">
              I can&apos;t build this, for two separate reasons. I won&apos;t make up a portfolio that only looks like
              it fits.
            </p>
            <ReportSection title="Brief check" notebook>
              <p className="text-ink-400 text-sm">Why this portfolio can&apos;t exist</p>
            </ReportSection>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pick one and I&apos;ll redo the rules</p>
              {WAYS_OUT.map((way) => (
                <AppLink
                  key={way}
                  route="rules"
                  slug={portfolio.id}
                  className={buttonVariants({ intent: "outline", size: "sm", className: "justify-start" })}
                >
                  {way}
                </AppLink>
              ))}
            </div>
          </AgentPanel>
        }
      >
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">This portfolio can&apos;t exist</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-400">
              {positions} robotics stocks · each at least {formatPercent(minimum)}
            </span>
            <Badge tone="negative">Can&apos;t be built</Badge>
          </div>
        </header>

        <ReportSection title="The maths">
          <h4 className="text-lg font-medium">
            {positions} positions of {formatPercent(minimum)} need {formatPercent(required)} of your money.
          </h4>
          <div className="flex flex-col gap-1">
            <div className="bg-inputBg relative h-3 overflow-hidden rounded-full dark:bg-white/10">
              <span className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: "100%" }} />
              <span className="bg-ink-100 absolute inset-y-0 w-0.5" style={{ left: `${(1 / required) * 100}%` }} />
            </div>
            <div className="text-ink-400 flex justify-between text-xs">
              <span>0%</span>
              <span>100%</span>
              <span>{formatPercent(required)}</span>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Universe">
          <h4 className="text-lg font-medium">Only {buyable.length} robotics-linked names have token supply.</h4>
          <ul className="flex flex-wrap gap-2">
            {universe.map((stock) => (
              <li key={stock.symbol}>
                <Badge tone={isBuyable(stock) ? "positive" : "neutral"}>{stock.symbol}</Badge>
              </li>
            ))}
          </ul>
          <p className="text-ink-400 text-xs">
            Green: buyable, liquidity ≥ $100K. Grey: listed, no token supply. Data <SourceLink {...summary.source} /> ·
            as of {formatAsOf(summary.asOf)}
          </p>
        </ReportSection>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Your rules</h2>
          <Card>
            <RulesList rules={rules} />
          </Card>
        </section>
      </FlowLayout>
    </div>
  )
}
