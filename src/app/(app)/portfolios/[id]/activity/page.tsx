import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { ActivityList } from "@/components/Activity/ActivityList"
import { FilterPills } from "@/components/FilterPills/FilterPills"
import { PortfolioShell } from "@/components/PortfolioDetail/PortfolioShell"
import { Card } from "@/components/ui/card"
import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { routeHref } from "@/config/routes"
import { ACTIVITY_FILTER_LABEL, ACTIVITY_FILTERS } from "@/constants/activity"
import { activityCounts, filterActivity, parseActivityFilter, tradeTotals } from "@/lib/activity/filter"
import { getActivity } from "@/lib/activity/source"
import { formatAmount } from "@/lib/format"
import { getPortfolio } from "@/lib/portfolios/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Activity" }

type PortfolioActivityPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ filter?: string }> }

// What happened to this portfolio alone: its trades with their receipts, the checks and refusals of the agent, its alerts
export default async function PortfolioActivityPage({ params, searchParams }: PortfolioActivityPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const portfolio = await getPortfolio(id)
  if (!portfolio) notFound()
  if (portfolio.status !== "live") redirect(routeHref("portfolio", undefined, id) ?? "/portfolios")

  const filter = parseActivityFilter(query.filter)
  const [session, activity] = await Promise.all([getSession(), getActivity(id)])
  const counts = activityCounts(activity)
  const totals = tradeTotals(activity)
  const stats = [
    { label: "Trades", value: String(totals.count) },
    { label: "Bought", value: formatAmount(totals.spent), usdc: true },
    { label: "Fees", value: formatAmount(totals.fees), usdc: true },
    { label: "Refused", value: String(totals.refused) },
  ]

  return (
    <PortfolioShell portfolio={portfolio} current="activity">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, usdc }, i) => (
          <Card
            key={label}
            style={{ "--index": i } as React.CSSProperties}
            className="animate-fade-up flex flex-col gap-1 rounded-[14px] px-5 py-4"
          >
            <span className="text-ink-200 text-[11px] font-medium tracking-wide uppercase">{label}</span>
            <span className="flex items-center gap-2 text-2xl font-medium tabular-nums">
              {value}
              {usdc && <UsdcMark className="size-5" />}
            </span>
          </Card>
        ))}
      </div>
      <FilterPills
        label="Filter activity"
        route="portfolioActivity"
        slug={id}
        param="filter"
        active={filter}
        options={ACTIVITY_FILTERS.map((value) => ({
          value,
          label:
            value === "alerts" || value === "refusals"
              ? `${ACTIVITY_FILTER_LABEL[value]} · ${counts[value]}`
              : ACTIVITY_FILTER_LABEL[value],
        }))}
      />
      <ActivityList activity={filterActivity(activity, filter)} now={session.now} />
    </PortfolioShell>
  )
}
