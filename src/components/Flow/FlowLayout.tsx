import type { ReactNode } from "react"

type FlowLayoutProps = { steps: ReactNode; aside?: ReactNode; children: ReactNode }

// A flow screen: the steps across the top, then the agent beside the page
export function FlowLayout({ steps, aside, children }: FlowLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      {steps}
      <div className={aside ? "grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : undefined}>
        {aside}
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </div>
  )
}
