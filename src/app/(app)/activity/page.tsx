import type { Metadata } from "next"

import { ActivityList } from "@/components/Activity/ActivityList"
import { AlertsFilterLabel } from "@/components/Activity/AlertsFilterLabel"
import { AlertsView } from "@/components/Activity/AlertsView"
import { FilterPills } from "@/components/FilterPills/FilterPills"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { ACTIVITY_FILTER_LABEL, ACTIVITY_FILTERS } from "@/constants/activity"
import { filterActivity, parseActivityFilter } from "@/lib/activity/filter"
import { getActivity } from "@/lib/activity/source"
import { getPortfolios } from "@/lib/portfolios/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Activity" }

type ActivityPageProps = { searchParams: Promise<{ filter?: string }> }

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const filter = parseActivityFilter((await searchParams).filter)
  const [session, activity, portfolios] = await Promise.all([getSession(), getActivity(), getPortfolios()])
  const portfolioNames = Object.fromEntries(portfolios.map(({ id, name }) => [id, name]))
  const events = filterActivity(activity, filter)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon="activity"
        title="Activity"
        description={<>Trades, refusals, alerts and everything the agent did</>}
      />
      <FilterPills
        label="Filter activity"
        route="activity"
        param="filter"
        active={filter}
        options={ACTIVITY_FILTERS.map((value) => ({
          value,
          label: value === "alerts" ? <AlertsFilterLabel /> : ACTIVITY_FILTER_LABEL[value],
        }))}
      />
      {filter === "alerts" ? (
        <AlertsView activity={events} now={session.now} portfolioNames={portfolioNames} />
      ) : (
        <ActivityList activity={events} now={session.now} portfolioNames={portfolioNames} filter={filter} />
      )}
    </div>
  )
}
