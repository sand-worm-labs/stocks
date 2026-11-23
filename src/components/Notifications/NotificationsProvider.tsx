"use client"

import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react"

import { saveNotificationState, useNotificationState } from "@/hooks/use-notification-state"
import {
  archive,
  archivedOf,
  archiveRead,
  inboxOf,
  isArchived,
  isUnread,
  markAllRead,
  markRead,
  type Notification,
  type NotificationState,
  unarchive,
  unreadCount,
} from "@/lib/notifications/notifications"

type Notifications = {
  inbox: Notification[]
  archived: Notification[]
  unread: number
  // The moment the page is for, to say how long ago each came
  now: string
  isUnread: (id: string) => boolean
  isArchived: (id: string) => boolean
  read: (id: string) => void
  readAll: () => void
  // One put away, and one brought back
  archive: (id: string) => void
  unarchive: (id: string) => void
  // Every one that has been read, put away
  archiveRead: () => void
}

const NotificationsContext = createContext<Notifications | undefined>(undefined)

type NotificationsProviderProps = {
  notifications: Notification[]
  // What had been done with them when the page was drawn, so the browser starts from the same
  initialState: NotificationState
  now: string
  children: ReactNode
}

// The notifications, and what has been done with them, for the bell, the badge on Activity, the bar on a phone and the
// alerts on the activity page. They all read the same, so they never disagree about what is new or put away.
export function NotificationsProvider({ notifications, initialState, now, children }: NotificationsProviderProps) {
  const state = useNotificationState(initialState)

  const read = useCallback((id: string) => saveNotificationState(markRead(state, id)), [state])
  const readAll = useCallback(() => saveNotificationState(markAllRead(notifications, state)), [notifications, state])
  const archiveOne = useCallback((id: string) => saveNotificationState(archive(state, id)), [state])
  const unarchiveOne = useCallback((id: string) => saveNotificationState(unarchive(state, id)), [state])
  const archiveAllRead = useCallback(
    () => saveNotificationState(archiveRead(notifications, state)),
    [notifications, state]
  )

  const value = useMemo<Notifications>(
    () => ({
      inbox: inboxOf(notifications, state),
      archived: archivedOf(notifications, state),
      unread: unreadCount(notifications, state),
      now,
      isUnread: (id) => isUnread(id, state),
      isArchived: (id) => isArchived(id, state),
      read,
      readAll,
      archive: archiveOne,
      unarchive: unarchiveOne,
      archiveRead: archiveAllRead,
    }),
    [notifications, state, now, read, readAll, archiveOne, unarchiveOne, archiveAllRead]
  )

  return <NotificationsContext value={value}>{children}</NotificationsContext>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error("Notifications are only there inside a NotificationsProvider")

  return context
}
