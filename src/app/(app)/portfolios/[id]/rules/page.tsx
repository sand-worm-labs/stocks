import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { LiveRules } from "@/components/PortfolioDetail/LiveRules"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { routeHref } from "@/config/routes"
import { getActivity } from "@/lib/activity/source"
import { getStocks } from "@/lib/markets/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { getRules } from "@/lib/rules/source"
import { specOf } from "@/lib/rules/spec"
import { getSession } from "@/lib/session/source"
import type { ModelDoc } from "@/lib/strategy/document"
import { getStrategy } from "@/lib/strategy/source"

export const metadata: Metadata = { title: "Rules" }

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const portfolio = await getPortfolio((await params).id)
  if (!portfolio) notFound()

  const rules = await getRules(portfolio)

  if (portfolio.status === "live") {
    const [stocks, activity, session, strategy] = await Promise.all([
      getStocks(),
      getActivity(portfolio.id),
      getSession(),
      getStrategy(portfolio),
    ])

    const doc: ModelDoc = { strategy, rules: rules.rules.flatMap((rule) => specOf(rule) ?? []) }

    return (
      <PortfolioShell portfolio={portfolio} current="rules">
        <LiveRules
          portfolio={portfolio}
          stocks={stocks.map(({ symbol, liquidity, series }) => ({ symbol, liquidity, series }))}
          doc={doc}
          strategy={rules.strategy}
          checks={activity.filter(({ kind }) => kind === "checked" || kind === "locked").slice(0, 4)}
          now={session.now}
        />
      </PortfolioShell>
    )
  }

  // A draft's rules are the first part of the one page it grows on
  redirect(routeHref("portfolio", undefined, portfolio.id) ?? "/portfolios")
}
