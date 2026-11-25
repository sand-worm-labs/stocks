import { ACTIVITY_KIND } from "@/constants/activity"
import type { Activity } from "@/types/activity"

export type Notification = Pick<Activity, "id" | "kind" | "title" | "detail" | "at" | "action">

export type NotificationState = { read: string[]; archived: string[] }

export const NO_NOTIFICATION_STATE: NotificationState = { read: [], archived: [] }

export const NOTIFICATIONS_SHOWN = 3

export const notificationsOf = (activity: Activity[]): Notification[] =>
  activity
    .filter(({ kind }) => ACTIVITY_KIND[kind].category === "alerts")
    .map(({ id, kind, title, detail, at, action }) => ({ id, kind, title, detail, at, action }))

export const inboxOf = (items: Notification[], { archived }: NotificationState) =>
  items.filter(({ id }) => !archived.includes(id))

export const archivedOf = (items: Notification[], { archived }: NotificationState) =>
  items.filter(({ id }) => archived.includes(id))

export const isUnread = (id: string, { read }: NotificationState) => !read.includes(id)

export const unreadCount = (items: Notification[], state: NotificationState) =>
  inboxOf(items, state).filter(({ id }) => isUnread(id, state)).length

export const isArchived = (id: string, { archived }: NotificationState) => archived.includes(id)

export const markRead = (state: NotificationState, id: string): NotificationState =>
  state.read.includes(id) ? state : { ...state, read: [...state.read, id] }

export const markAllRead = (items: Notification[], state: NotificationState): NotificationState => ({
  ...state,
  read: [...new Set([...state.read, ...inboxOf(items, state).map(({ id }) => id)])],
})

export const archiveRead = (items: Notification[], state: NotificationState): NotificationState => ({
  ...state,
  archived: [
    ...new Set([
      ...state.archived,
      ...inboxOf(items, state)
        .filter(({ id }) => !isUnread(id, state))
        .map(({ id }) => id),
    ]),
  ],
})

export const archive = (state: NotificationState, id: string): NotificationState => ({
  read: state.read.includes(id) ? state.read : [...state.read, id],
  archived: state.archived.includes(id) ? state.archived : [...state.archived, id],
})

export const unarchive = (state: NotificationState, id: string): NotificationState =>
  state.archived.includes(id) ? { ...state, archived: state.archived.filter((kept) => kept !== id) } : state

const ids = (value: unknown) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []

// Kept in a cookie, not the browser's storage, so that the server can draw the page with it already applied: a page that
// learned of it only in the browser would show what is new for a moment and then take it away.
export const NOTIFICATIONS_COOKIE = "sw_notifications"

export const serializeNotificationState = (state: NotificationState) => encodeURIComponent(JSON.stringify(state))

const decode = (raw: string) => {
  try {
    return raw.startsWith("{") ? raw : decodeURIComponent(raw)
  } catch {
    return ""
  }
}

// What was kept, read back. Anything that isn't what was written is as if nothing was.
export function parseNotificationState(raw: string | null | undefined): NotificationState {
  if (!raw) return NO_NOTIFICATION_STATE

  try {
    const value = JSON.parse(decode(raw)) as Partial<Record<keyof NotificationState, unknown>> | null
    return { read: ids(value?.read), archived: ids(value?.archived) }
  } catch {
    return NO_NOTIFICATION_STATE
  }
}
