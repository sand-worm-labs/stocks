import type { ReactNode } from "react"

import { SkeletonScope } from "./SkeletonScope"

// What every page's `loading.tsx` wraps its placeholder in: it tells a screen reader the page is on its way, and it tells
// the page that content arriving here should settle in place, not fade up from nothing (see SkeletonScope)
export function SkeletonShell({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <SkeletonScope />
      {children}
    </div>
  )
}
