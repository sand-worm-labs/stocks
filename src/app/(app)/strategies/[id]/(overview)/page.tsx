import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CantMeetView } from "@/components/Flow/CantMeetView"
import { ExitsCard } from "@/components/PortfolioDetail/ExitsCard"
import { HoldingsTable } from "@/components/PortfolioDetail/HoldingsTable"
import { PortfolioHeroLive } from "@/components/PortfolioDetail/PortfolioHeroLive"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { RecentActivity } from "@/components/PortfolioDetail/RecentActivity"
import { ValueCard } from "@/components/PortfolioDetail/ValueCard"
import { DraftWorkspace } from "@/components/Workspace/DraftWorkspace"
import { getActivity } from "@/lib/activity/source"
import { getCantMeetScript } from "@/lib/agent/source"
import { getBenchmarks } from "@/lib/benchmarks/source"
import { getMarketSummary, getStocks } from "@/lib/markets/source"
import { getHeldAddresses } from "@/lib/portfolios/addresses"
import { getPortfolio } from "@/lib/portfolios/source"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"
import { getStrategy } from "@/lib/strategy/source"

export const metadata: Metadata = { title: "Strategy" }

// A portfolio opens on the page its status calls for: a draft is one page that builds itself, a brief that can't be
// met is explained, and a live portfolio shows how it is doing.
export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const portfolio = await getPortfolio(id)
  if (!portfolio) notFound()
  if (portfolio.status === "draft") return <DraftWorkspace portfolio={portfolio} />

  const [{ rules }, stocks, summary] = await Promise.all([getRules(portfolio), getStocks(), getMarketSummary()])

  if (portfolio.status === "unbuildable") {
    const script = await getCantMeetScript(portfolio)

    return (
      <CantMeetView
        portfolio={portfolio}
        rules={rules}
        universe={stocks.filter(({ theme }) => theme === "robotics")}
        summary={summary}
        script={script}
      />
    )
  }

  const [session, activity, benchmarks, addresses, strategy] = await Promise.all([
    getSession(),
    getActivity(id),
    getBenchmarks(),
    getHeldAddresses([portfolio]),
    getStrategy(portfolio),
  ])

  return (
    <PortfolioShell portfolio={portfolio} current="overview">
      <PortfolioHeroLive portfolio={portfolio} addresses={addresses} />
      <ValueCard portfolio={portfolio} benchmarks={benchmarks} now={session.now} />
      <HoldingsTable
        portfolio={portfolio}
        cap={maxWeightOf(rules) ?? 1}
        addresses={addresses}
        mode={session.network.mode}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ExitsCard portfolio={portfolio} rules={rules} strategy={strategy} />
        <RecentActivity portfolioId={id} activity={activity} now={session.now} />
      </div>
    </PortfolioShell>
  )
}
