import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

// A choice kept in the browser, one of `options`. The server and the first drawing show `fallback`, the kept choice follows, and a change
// made here or in another tab is seen by everything that reads it. Anything stored that isn't one of the options is the fallback.
export function useStoredChoice<T extends string>(key: string, options: readonly T[], fallback: T) {
  const read = () => {
    try {
      const stored = localStorage.getItem(key)
      return options.find((option) => option === stored) ?? fallback
    } catch {
      return fallback
    }
  }
  const value = useSyncExternalStore(subscribe, read, () => fallback)

  const set = (next: T) => {
    try {
      localStorage.setItem(key, next)
    } catch {}
    listeners.forEach((listener) => listener())
  }
  return [value, set] as const
}
