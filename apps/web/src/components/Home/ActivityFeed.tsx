import { AppLink } from "@/components/AppLink/AppLink"
import { Card } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import { ACTIVITY_KIND } from "@/constants/activity"
import { formatActivityTime } from "@/lib/dates"
import type { Activity } from "@/types/activity"

export function ActivityFeed({ activity, now }: { activity: Activity[]; now: string }) {
  if (!activity.length) return null

  return (
    <Card>
      <div className="flex items-baseline justify-between p-5 pb-3">
        <h2 className="text-lg font-medium">What the agent did</h2>
        <AppLink route="activity" className="text-ink-400 hover:text-ink-100 text-sm font-medium transition-colors">
          All activity →
        </AppLink>
      </div>
      <ul className="px-2 pb-2">
        {activity.map(({ id, kind, title, detail, at }) => (
          <li key={id} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
            <IconTile icon={ACTIVITY_KIND[kind].icon} className="size-9" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-ink-400 text-sm">{detail}</span>
              <time dateTime={at} className="text-ink-400 mt-0.5 text-xs">
                {formatActivityTime(at, now)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
