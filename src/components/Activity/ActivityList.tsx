import { Card } from "@/components/ui/card"
import { groupByDay, summarizeDay } from "@/lib/activity/filter"
import type { Activity } from "@/lib/activity/types"
import { formatAmount, pluralize } from "@/lib/format"

import { ActivityRow } from "./ActivityRow"

type ActivityListProps = {
  activity: Activity[]
  now: string
  // Names of portfolios by id. Given, each event says which portfolio it is from.
  portfolioNames?: Record<string, string>
}

export function ActivityList({ activity, now, portfolioNames }: ActivityListProps) {
  if (!activity.length) return <p className="text-ink-400 py-8 text-center text-sm">Nothing here yet.</p>

  return (
    <div className="flex flex-col gap-6">
      {groupByDay(activity, now).map(({ label, events }) => {
        const trades = summarizeDay(events)
        return (
          <section key={label} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-ink-400 text-sm font-medium">{label}</h2>
              {trades && (
                <span className="text-ink-400 text-xs tabular-nums">
                  {pluralize(trades.count, "trade")} · {formatAmount(trades.spend)} USDC
                </span>
              )}
            </div>
            <Card>
              {events.map((event) => (
                <ActivityRow key={event.id} activity={event} portfolioName={portfolioNames?.[event.portfolioId]} />
              ))}
            </Card>
          </section>
        )
      })}
    </div>
  )
}
