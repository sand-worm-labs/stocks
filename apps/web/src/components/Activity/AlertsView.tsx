"use client"

import { useState } from "react"

import { ActivityList } from "@/components/Activity/ActivityList"
import {
  NotificationsEmpty,
  NotificationTabs,
  NotificationToolbar,
} from "@/components/Notifications/NotificationControls"
import { useNotifications } from "@/components/Notifications/NotificationsProvider"
import type { Activity } from "@/types/activity"
import type { NotificationTab } from "@/types/ui"

type AlertsViewProps = {
  activity: Activity[]
  now: string
  portfolioNames?: Record<string, string>
}

export function AlertsView({ activity, now, portfolioNames }: AlertsViewProps) {
  const { inbox, archived } = useNotifications()
  const [tab, setTab] = useState<NotificationTab>("inbox")

  const shown = new Set((tab === "inbox" ? inbox : archived).map(({ id }) => id))
  const events = activity.filter(({ id }) => shown.has(id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <NotificationTabs value={tab} onChange={setTab} />
        </div>
        {tab === "inbox" && <NotificationToolbar />}
      </div>
      {events.length ? (
        <ActivityList activity={events} now={now} portfolioNames={portfolioNames} />
      ) : (
        <NotificationsEmpty tab={tab} />
      )}
    </div>
  )
}
