import { Card } from "@/components/ui/card"
import { groupByDay } from "@/lib/activity/filter"
import type { Activity } from "@/lib/activity/types"

import { ActivityRow } from "./ActivityRow"

export function ActivityList({ activity, now }: { activity: Activity[]; now: string }) {
  if (!activity.length) return <p className="text-ink-400 py-8 text-center text-sm">Nothing here yet.</p>

  return (
    <div className="flex flex-col gap-6">
      {groupByDay(activity, now).map(({ label, events }) => (
        <section key={label} className="flex flex-col gap-2">
          <h2 className="text-ink-400 text-sm font-medium">{label}</h2>
          <Card>
            {events.map((event) => (
              <ActivityRow key={event.id} activity={event} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}
