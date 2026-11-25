"use client"

import { useLayoutEffect } from "react"
import { SETTLE_MS } from "@/constants/components/skeleton/skeleton-scope"

// How many placeholders are on the page, so that one going while another stays doesn't end the scope
let shown = 0

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
