import { useCallback, useRef, useSyncExternalStore } from "react"

// The time now, in milliseconds, read again every `everyMs` while `active`. Nothing until the page is up in the browser, because the
// server's clock and the browser's are not the same one, so what depends on it starts from the browser's.
export function useNow(everyMs: number, active = true) {
  const latest = useRef<number>(undefined)

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!active) return () => {}
      const read = () => {
        latest.current = Date.now()
        notify()
      }
      read()
      const timer = setInterval(read, everyMs)
      return () => clearInterval(timer)
    },
    [everyMs, active]
  )

  return useSyncExternalStore(
    subscribe,
    () => latest.current,
    () => undefined
  )
}
