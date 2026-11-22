"use client"

import { useLayoutEffect, useRef } from "react"

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const MOVE_MS = 550
const ENTER_MS = 600
const STAGGER_MS = 45

// Animates a row of items as they come and go, using nothing but the browser's own animations of transform and opacity,
// which it can run off the main thread. An item that is already there glides to its new place, instead of jumping. A
// new one rises in from the side.
//
// The items need `data-flip-key`, a stable key.
export function useFlip<T extends HTMLElement>(change: unknown) {
  const container = useRef<T>(null)
  const lefts = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const list = container.current
    if (!list) return

    const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isFirst = lefts.current.size === 0
    const next = new Map<string, number>()

    Array.from(list.children as HTMLCollectionOf<HTMLElement>).forEach((item, index) => {
      const key = item.dataset.flipKey
      if (!key) return

      const left = item.getBoundingClientRect().left
      const before = lefts.current.get(key)
      next.set(key, left)
      if (isCalm) return

      if (before === undefined) {
        item.animate(
          [
            { opacity: 0, transform: "translateX(-32px) scale(0.92)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: ENTER_MS, easing: EASE, delay: isFirst ? index * STAGGER_MS : 0, fill: "backwards" }
        )
      } else if (Math.abs(before - left) > 0.5) {
        item.animate([{ transform: `translateX(${before - left}px)` }, { transform: "none" }], {
          duration: MOVE_MS,
          easing: EASE,
        })
      }
    })

    lefts.current = next
  }, [change])

  return container
}
