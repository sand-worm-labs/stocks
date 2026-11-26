import type { CSSProperties, ReactNode } from "react"

export function Reveal({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className="animate-fade-up" style={{ "--index": index } as CSSProperties}>
      {children}
    </div>
  )
}
