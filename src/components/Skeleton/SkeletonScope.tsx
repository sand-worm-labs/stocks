"use client"

import { useLayoutEffect } from "react"

const SETTLE_MS = 700

// How many placeholders are on the page, so that one going while another stays doesn't end the scope
let shown = 0

// Put in a placeholder to tell the page it is standing in for content. While it is there, and for a moment after, the
// page's entrance animations are off (see `html[data-skeleton]`), so content that arrives where it was doesn't blank it
// by starting from nothing. It is a layout effect so that the content which replaces the placeholder, in the same commit,
// already finds the attribute set when the browser first draws it.
export function SkeletonScope() {
  useLayoutEffect(() => {
    const root = document.documentElement
    shown += 1
    root.dataset.skeleton = "on"

    let timer: ReturnType<typeof setTimeout> | undefined
    return () => {
      shown -= 1
      if (shown > 0) return

      root.dataset.skeleton = "settling"
      timer = setTimeout(() => {
        if (shown === 0) delete root.dataset.skeleton
      }, SETTLE_MS)
      // A timer left running when this is gone is harmless: it only ever clears the attribute
      void timer
    }
  }, [])

  return null
}
