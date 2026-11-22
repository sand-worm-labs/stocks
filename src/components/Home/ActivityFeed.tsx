import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import { ACTIVITY_KIND } from "@/constants/activity"
import type { Activity } from "@/lib/activity/types"
import { formatActivityTime } from "@/lib/dates"

export function ActivityFeed({ activity, now }: { activity: Activity[]; now: string }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="What the agent did" link={{ route: "activity", label: "All activity →" }} />
      <Card>
        {activity.map(({ id, kind, title, detail, at }) => (
          <CardRow key={id} className="flex items-start gap-3 p-4">
            <IconTile icon={ACTIVITY_KIND[kind].icon} tone={ACTIVITY_KIND[kind].tone} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-ink-400 text-sm">{detail}</span>
            </div>
            <time dateTime={at} className="text-ink-400 flex-none text-xs">
              {formatActivityTime(at, now)}
            </time>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
