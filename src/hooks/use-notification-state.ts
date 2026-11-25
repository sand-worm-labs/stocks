"use client"

import { useRef, useSyncExternalStore } from "react"

import { MAX_AGE_SECONDS } from "@/constants/hooks/use-notification-state"
import {
  NOTIFICATIONS_COOKIE,
  type NotificationState,
  parseNotificationState,
  serializeNotificationState,
} from "@/lib/notifications/notifications"

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

export function useNotificationState(initial: NotificationState) {
  const server = useRef(initial)

  const read = () => {
    const raw = cookieValue()
    let current = cache

    if (!current || current.raw !== raw) {
      const isPagesOwn = raw === undefined || raw === serializeNotificationState(server.current)
      current = { raw, state: isPagesOwn ? server.current : parseNotificationState(raw) }
      cache = current
    }

    return current.state
  }

  return useSyncExternalStore(subscribe, read, () => server.current)
}
