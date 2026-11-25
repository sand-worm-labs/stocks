import type { ReactNode } from "react"

import { PANEL_VARS } from "@/constants/components/flow/flow-layout"
import { cn } from "@/lib/utils"

import { AgentDock } from "./AgentDock"

type FlowLayoutProps = {
  steps?: ReactNode
  aside?: ReactNode
  agent?: "open" | "on-demand"
  children: ReactNode
}

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
