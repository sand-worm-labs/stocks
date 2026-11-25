"use client"

import { type ReactNode, useState } from "react"

import { AgentPanelContext } from "@/components/Agent/AgentPanelContext"
import { SparkleAI } from "@/components/ui/sparkle-ai"

import { cn } from "@/lib/utils"

type AgentDockProps = { aside: ReactNode; children: ReactNode }

export function AgentDock({ aside, children }: AgentDockProps) {
  const [open, setOpen] = useState(false)
  // Not drawn until the first time it is opened, so it starts its conversation when it is wanted
  const [opened, setOpened] = useState(false)

  const toggle = (next: boolean) => {
    if (next && !opened) {
      // The panel is drawn closed first and slid in once it has settled, so there is a closed state for it to slide out of and the slide does not share frames with drawing it
      setOpened(true)
      setTimeout(() => setOpen(true), 100)
      return
    }
    setOpen(next)
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 motion-reduce:transition-none lg:transition-[padding] lg:duration-300 lg:ease-in-out",
        open && "lg:pr-panel"
      )}
    >
      {children}
      {opened && (
        // A drawer: its width opens from the right edge and closes again, in the same frames as the page's padding, so the two
        // never drift apart. Its content keeps its own width and is clipped by the edge as it opens. Closed, it is out of
        // sight and out of reach but still there, so its conversation is kept.
        <div
          inert={!open}
          className={cn(
            "max-lg:h-[36rem] lg:fixed lg:inset-y-0 lg:top-[var(--shell-top)] lg:right-0 lg:z-30 lg:overflow-hidden",
            "motion-reduce:transition-none lg:transition-[width,visibility] lg:duration-300 lg:ease-in-out",
            open ? "max-lg:animate-panel lg:w-[var(--panel)]" : "max-lg:hidden lg:invisible lg:w-0"
          )}
        >
          <div className="h-full lg:w-[var(--panel)]">
            <AgentPanelContext value={{ close: () => toggle(false) }}>{aside}</AgentPanelContext>
          </div>
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => toggle(true)}
          className="animate-fade-up border-border-secondary fixed right-6 bottom-6 z-30 flex items-center gap-2.5 rounded-xl border bg-white py-1.5 pr-6 pl-3 text-sm font-medium text-black shadow-[0_4px_16px_rgba(15,15,15,0.14),0_1px_3px_rgba(15,15,15,0.1)] transition-shadow hover:shadow-[0_6px_22px_rgba(15,15,15,0.2),0_1px_3px_rgba(15,15,15,0.12)]"
        >
          <SparkleAI size={32} />
          Ask the agent
        </button>
      )}
    </div>
  )
}
