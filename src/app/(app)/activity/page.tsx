import type { Metadata } from "next"

import { ActivityList } from "@/components/Activity/ActivityList"
import { FilterPills } from "@/components/FilterPills/FilterPills"
import { PageHeader } from "@/components/PageHeader/PageHeader"
import { ACTIVITY_FILTER_LABEL, ACTIVITY_FILTERS } from "@/constants/activity"
import { activityCounts, filterActivity, parseActivityFilter } from "@/lib/activity/filter"
import { getActivity } from "@/lib/activity/source"
import { getSession } from "@/lib/session/source"

export const metadata: Metadata = { title: "Activity" }

type ActivityPageProps = { searchParams: Promise<{ filter?: string }> }

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const filter = parseActivityFilter((await searchParams).filter)
  const [session, activity] = await Promise.all([getSession(), getActivity()])
  const counts = activityCounts(activity)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity" description={<>Trades, refusals, alerts and everything the agent did</>} />
      <FilterPills
        label="Filter activity"
        route="activity"
        param="filter"
        active={filter}
        options={ACTIVITY_FILTERS.map((value) => ({
          value,
          label:
            value === "alerts" ? `${ACTIVITY_FILTER_LABEL[value]} · ${counts[value]}` : ACTIVITY_FILTER_LABEL[value],
        }))}
      />
      <ActivityList activity={filterActivity(activity, filter)} now={session.now} />
    </div>
  )
}
