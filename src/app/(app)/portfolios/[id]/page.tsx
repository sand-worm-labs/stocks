import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { CantMeetView } from "@/components/Flow/CantMeetView"
import { KpiStrip } from "@/components/Home/KpiStrip"
import { AgentCard } from "@/components/PortfolioDetail/AgentCard"
import { ExitsCard } from "@/components/PortfolioDetail/ExitsCard"
import { HistoryCard } from "@/components/PortfolioDetail/HistoryCard"
import { HoldingsTable } from "@/components/PortfolioDetail/HoldingsTable"
import { PortfolioHeader } from "@/components/PortfolioDetail/PortfolioHeader"
import { RulesCard } from "@/components/PortfolioDetail/RulesCard"
import { SellSheet } from "@/components/PortfolioDetail/SellSheet"
import { ValueCard } from "@/components/PortfolioDetail/ValueCard"
import { routeHref } from "@/config/routes"
import { getActivity } from "@/lib/activity/source"
import { getCantMeetScript } from "@/lib/agent/source"
import { getMarketSummary, getStocks } from "@/lib/markets/source"
import { portfolioKpis } from "@/lib/portfolios/kpis"
import { sellQuote } from "@/lib/portfolios/sell"
import { getPortfolio } from "@/lib/portfolios/source"
import { getRules } from "@/lib/rules/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Portfolio" }

type PortfolioPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sell?: string }>
}

// A portfolio opens on the page its status calls for: a draft goes back to its rules, a brief that can't be met
// is explained, and a live portfolio shows how it is doing.
export default async function PortfolioPage({ params, searchParams }: PortfolioPageProps) {
  const [{ id }, { sell }] = await Promise.all([params, searchParams])
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

  const [session, activity] = await Promise.all([getSession(), getActivity()])
  const quote = sell && sell !== "all" ? sellQuote(portfolio, sell) : undefined

  return (
    <div className="flex flex-col gap-6">
      <PortfolioHeader portfolio={portfolio} />
      <KpiStrip kpis={portfolioKpis(portfolio)} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ValueCard portfolio={portfolio} summary={summary} />
          <HoldingsTable portfolio={portfolio} />
          <ExitsCard portfolioId={portfolio.id} />
          <HistoryCard portfolio={portfolio} />
        </div>
        <div className="flex flex-col gap-6">
          <RulesCard portfolio={portfolio} rules={rules} />
          <AgentCard
            activity={activity.filter(({ kind }) => kind === "refused" || kind === "checked")}
            now={session.now}
          />
        </div>
      </div>
      {quote && <SellSheet portfolio={portfolio} quote={quote} />}
    </div>
  )
}
