"use client"

import { useRef, useSyncExternalStore } from "react"

import {
  NOTIFICATIONS_COOKIE,
  type NotificationState,
  parseNotificationState,
  serializeNotificationState,
} from "@/lib/notifications/notifications"

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const listeners = new Set<() => void>()
// What the cookie last held, and the state made of it, so that the same text is the same object and nothing draws again
// for no reason. Until the browser has said otherwise it is what the server drew the page with.
let cache: { raw: string | undefined; state: NotificationState } | undefined

const cookieValue = () =>
  document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${NOTIFICATIONS_COOKIE}=`))
    ?.slice(NOTIFICATIONS_COOKIE.length + 1)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function saveNotificationState(state: NotificationState) {
  const raw = serializeNotificationState(state)
  cache = { raw, state }
  document.cookie = `${NOTIFICATIONS_COOKIE}=${raw}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`
  listeners.forEach((listener) => listener())
}

// Which notifications have been read and which put away, the same in every part of the page. The server draws the page with
// the cookie's, so it is right from the first paint; `initial` is that, and it is what hydration starts from.
export function useNotificationState(initial: NotificationState) {
  const server = useRef(initial)

  const read = () => {
    const raw = cookieValue()
    let current = cache

    if (!current || current.raw !== raw) {
      // No cookie yet, or one that is what the page was drawn with: the state is the page's own, not a copy of it
      const isPagesOwn = raw === undefined || raw === serializeNotificationState(server.current)
      current = { raw, state: isPagesOwn ? server.current : parseNotificationState(raw) }
      cache = current
    }

    return current.state
  }

  return useSyncExternalStore(subscribe, read, () => server.current)
}
