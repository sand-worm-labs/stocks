import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { CantMeetView } from "@/components/Flow/CantMeetView"
import { ExitsCard } from "@/components/PortfolioDetail/ExitsCard"
import { HoldingsTable } from "@/components/PortfolioDetail/HoldingsTable"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { PortfolioStats } from "@/components/PortfolioDetail/PortfolioStats"
import { RecentActivity } from "@/components/PortfolioDetail/RecentActivity"
import { ValueCard } from "@/components/PortfolioDetail/ValueCard"
import { routeHref } from "@/config/routes"
import { getActivity } from "@/lib/activity/source"
import { getCantMeetScript } from "@/lib/agent/source"
import { getMarketSummary, getStocks } from "@/lib/markets/source"
import { getPortfolio } from "@/lib/portfolios/source"
import { maxWeightOf } from "@/lib/rules/readings"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Portfolio" }

// A portfolio opens on the page its status calls for: a draft goes back to its rules, a brief that can't be met
// is explained, and a live portfolio shows how it is doing.
export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const portfolio = await getPortfolio(id)
  if (!portfolio) notFound()
  if (portfolio.status === "draft") redirect(routeHref("rules", undefined, id) ?? "/portfolios")

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

  const [session, activity] = await Promise.all([getSession(), getActivity(id)])

  return (
    <PortfolioShell portfolio={portfolio} current="overview">
      <PortfolioStats portfolio={portfolio} now={session.now} />
      <ValueCard portfolio={portfolio} summary={summary} now={session.now} />
      <HoldingsTable portfolio={portfolio} cap={maxWeightOf(rules) ?? 1} />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <ExitsCard portfolio={portfolio} />
        <RecentActivity portfolioId={id} activity={activity} now={session.now} />
      </div>
    </PortfolioShell>
  )
}
