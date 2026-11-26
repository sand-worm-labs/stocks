"use client"

import { useNotifications } from "@/components/Notifications/NotificationsProvider"
import { ACTIVITY_FILTER_LABEL } from "@/constants/activity"

export function AlertsFilterLabel() {
  const { unread } = useNotifications()

  return <>{unread > 0 ? `${ACTIVITY_FILTER_LABEL.alerts} · ${unread}` : ACTIVITY_FILTER_LABEL.alerts}</>
}
