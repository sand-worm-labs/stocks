import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { AgentDock } from "./AgentDock"

type FlowLayoutProps = {
  steps?: ReactNode
  aside?: ReactNode
  // Whether the agent is there from the start, as in the flow of making a portfolio, or comes only when asked for
  agent?: "open" | "on-demand"
  children: ReactNode
}

// The width of the agent's panel. The page keeps clear of it by that much, less whatever empty space the window already
// leaves at the sides.
const PANEL_WIDTH = "26rem"

const PANEL_VARS = { "--panel": PANEL_WIDTH } as React.CSSProperties

// Where a flow screen sits the steps and the page, and the agent: a panel against the right edge of the window, from
// under the header and the price strip to the bottom, staying there as the page scrolls. Without an agent, the page has the
// whole width.
export function FlowLayout({ steps, aside, agent = "open", children }: FlowLayoutProps) {
  if (aside && agent === "on-demand") {
    return (
      <div style={PANEL_VARS}>
        <AgentDock aside={aside}>
          {steps}
          {children}
        </AgentDock>
      </div>
    )
  }

  return (
    <div style={aside ? PANEL_VARS : undefined} className={cn("flex flex-col gap-6", aside && "lg:pr-panel")}>
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
