import { useSyncExternalStore } from "react"

type Permission = NotificationPermission | "unsupported"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

const read = (): Permission => ("Notification" in window ? Notification.permission : "unsupported")

// Whether this browser will show notifications, and a way to ask for it, which has to be in answer to a click. What the person answers
// is picked up by everything that reads it.
export function useNotificationPermission() {
  const permission = useSyncExternalStore(subscribe, read, (): Permission => "default")
  const ask = () => Notification.requestPermission().then(() => listeners.forEach((listener) => listener()))
  return { permission, ask }
}
