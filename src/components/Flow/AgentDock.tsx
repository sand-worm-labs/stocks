"use client"

import { type ReactNode, useState } from "react"
import { PiSparkle } from "react-icons/pi"

import { AgentPanelContext } from "@/components/Agent/AgentPanelContext"

import { cn } from "@/lib/utils"

type AgentDockProps = { aside: ReactNode; children: ReactNode }

// An agent that stays out of the way until it is asked for: a button in the corner opens it as a panel at the edge, and
// the page makes room. Closing hides it and keeps the conversation, so opening it again carries on from where it was.
export function AgentDock({ aside, children }: AgentDockProps) {
  const [open, setOpen] = useState(false)
  // Not drawn until the first time it is opened, so it starts its conversation when it is wanted
  const [opened, setOpened] = useState(false)

  const toggle = (next: boolean) => {
    setOpen(next)
    if (next) setOpened(true)
  }

  return (
    <div className={cn("flex flex-col gap-6", open && "lg:pr-panel")}>
      {children}
      {opened && (
        <div
          hidden={!open}
          className="animate-panel max-lg:h-[36rem] lg:fixed lg:inset-y-0 lg:top-[var(--shell-top)] lg:right-0 lg:z-30 lg:w-[var(--panel)]"
        >
          <AgentPanelContext value={{ close: () => toggle(false) }}>{aside}</AgentPanelContext>
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => toggle(true)}
          className="bg-base-400 animate-fade-up fixed right-6 bottom-6 z-30 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-85 dark:bg-white dark:text-black"
        >
          <PiSparkle size={16} aria-hidden="true" />
          Ask the agent
        </button>
      )}
    </div>
  )
}
