import { PiArrowRight, PiPulse } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Card } from "@/components/ui/card"
import { EmptyResults } from "@/components/ui/empty-results"
import { IconTile } from "@/components/ui/icon-tile"
import { ACTIVITY_KIND } from "@/constants/activity"
import type { Activity } from "@/lib/activity/types"
import { formatActivityTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

const SHOWN = 4

type RecentActivityProps = { portfolioId: string; activity: Activity[]; now: string }

// The latest of what happened to this portfolio, with the way to all of it
export function RecentActivity({ portfolioId, activity, now }: RecentActivityProps) {
  return (
    <Card className="flex flex-col gap-3 rounded-[14px] p-4 md:px-6 md:py-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[17px] font-medium">What the agent did.</h3>
        <AppLink
          route="portfolioActivity"
          slug={portfolioId}
          className="text-accent dark:text-primary inline-flex items-center gap-1 text-xs hover:underline"
        >
          All activity <PiArrowRight aria-hidden="true" size={12} />
        </AppLink>
      </div>
      {!activity.length && (
        <EmptyResults
          icon={PiPulse}
          title="Nothing yet"
          hint="What the agent does for this strategy will show up here."
          className="flex-1 py-8"
        />
      )}
      <ul className="-mx-2 flex flex-col">
        {activity.slice(0, SHOWN).map(({ id, kind, title, detail, at, trade }) => {
          const { icon } = ACTIVITY_KIND[kind]
          return (
            <li key={id}>
              <AppLink
                route="portfolioActivity"
                slug={portfolioId}
                className={cn("flex items-center gap-3 p-2", listItemHoverClassName)}
              >
                {trade ? (
                  <StockAvatar symbol={trade.symbol} className="size-8" />
                ) : (
                  <IconTile icon={icon} className="size-8" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">{title}</span>
                  <span className="text-ink-400 truncate text-xs">{detail}</span>
                </span>
                <span className="text-ink-400 flex-none text-xs">{formatActivityTime(at, now)}</span>
              </AppLink>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
