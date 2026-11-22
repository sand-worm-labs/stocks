import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FlowLayoutProps = { steps: ReactNode; aside?: ReactNode; children: ReactNode }

// The width of the agent's panel. The page keeps clear of it by that much, less whatever empty space the window already
// leaves at the sides.
const PANEL_WIDTH = "26rem"

// Where a flow screen sits the steps and the page, and the agent: a panel against the right edge of the window, from
// under the header and the price strip to the bottom, staying there as the page scrolls. Without an agent, the page has the
// whole width.
export function FlowLayout({ steps, aside, children }: FlowLayoutProps) {
  return (
    <div
      style={aside ? ({ "--panel": PANEL_WIDTH } as React.CSSProperties) : undefined}
      className={cn("flex flex-col gap-6", aside && "lg:pr-panel")}
    >
      {steps}
      {children}
      {aside && (
        <div className="max-lg:h-[36rem] lg:fixed lg:inset-y-0 lg:top-[var(--shell-top)] lg:right-0 lg:z-30 lg:w-[var(--panel)]">
          {aside}
        </div>
      )}
    </div>
  )
}
