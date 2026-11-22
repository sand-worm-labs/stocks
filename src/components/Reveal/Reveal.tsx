import type { CSSProperties, ReactNode } from "react"

// Content that settles into place, each block a little after the one before
export function Reveal({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="animate-fade-up" style={{ "--index": index } as CSSProperties}>
      {children}
    </div>
  )
}
