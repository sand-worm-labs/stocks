import type { ReactNode } from "react"

import { SkeletonScope } from "./SkeletonScope"

export function SkeletonShell({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <SkeletonScope />
      {children}
    </div>
  )
}
