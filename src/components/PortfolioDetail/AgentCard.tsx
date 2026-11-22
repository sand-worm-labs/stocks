import { AppLink } from "@/components/AppLink/AppLink"
import { AgentComposer } from "@/components/Flow/AgentComposer"
import { Badge } from "@/components/ui/badge"
import { Card, CardRow } from "@/components/ui/card"
import { ACTIVITY_KIND } from "@/constants/activity"
import type { Activity } from "@/lib/activity/types"
import { formatActivityTime } from "@/lib/dates"

const QUICK_ASKS = ["Sell Tesla", "Set a stop-loss", "Add a fifth stock"]

export function AgentCard({ activity, now }: { activity: Activity[]; now: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-medium">Agent</h3>
        <AppLink route="activity" className="text-ink-400 hover:text-ink-100 text-sm font-medium">
          All activity
        </AppLink>
      </div>
      <Card>
        {activity.map(({ id, kind, detail, at }) => (
          <CardRow key={id} className="flex flex-col items-start gap-1 p-4 text-sm">
            <Badge tone={ACTIVITY_KIND[kind].tone}>{kind.toUpperCase()}</Badge>
            <span>
              {detail} <span className="text-ink-400">{formatActivityTime(at, now)}</span>
            </span>
          </CardRow>
        ))}
        <CardRow className="flex flex-col gap-3 p-4">
          <AgentComposer />
          <div className="flex flex-wrap gap-2">
            {QUICK_ASKS.map((ask) => (
              <button
                key={ask}
                type="button"
                className="border-border hover:border-primary dark:border-border-tertiary rounded-full border px-3 py-1 text-xs transition-colors"
              >
                {ask}
              </button>
            ))}
          </div>
        </CardRow>
      </Card>
    </section>
  )
}
