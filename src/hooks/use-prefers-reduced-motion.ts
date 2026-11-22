"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", notify)
  return () => media.removeEventListener("change", notify)
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
