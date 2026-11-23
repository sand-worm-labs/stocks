import { ACTIVITY_KIND } from "@/constants/activity"
import type { Activity } from "@/lib/activity/types"

// What a notification is here: an event the agent raised for the owner to look at, the price alerts and the gaps. They are
// the "alerts" of the activity, so the page of all of them is that page, filtered.
export type Notification = Pick<Activity, "id" | "kind" | "title" | "detail" | "at" | "action">

// Which of them have been read, and which put away. Kept by id, in the browser, until accounts keep it.
export type NotificationState = { read: string[]; archived: string[] }

export const NO_NOTIFICATION_STATE: NotificationState = { read: [], archived: [] }

// More than this many and the panel shows the first few and a link to the rest
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

// Puts away the ones that have been read, and leaves the ones still to read where they are
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

// Puts one away. It is read by then: something put away is not something still to read.
export const archive = (state: NotificationState, id: string): NotificationState => ({
  read: state.read.includes(id) ? state.read : [...state.read, id],
  archived: state.archived.includes(id) ? state.archived : [...state.archived, id],
})

// Brings one back to the inbox, as read as it was
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
