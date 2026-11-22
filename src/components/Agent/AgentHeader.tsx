"use client"

import Link from "next/link"
import { PiSparkle, PiX } from "react-icons/pi"

import type { AgentScript } from "@/lib/agent/types"

import { useAgentPanel } from "./AgentPanelContext"

// Who is here, a way to everything it has done, and a way to close it where it can be closed. There is one conversation
// for a portfolio, so no threads to choose between.
export function AgentHeader({ activityHref }: Pick<AgentScript, "activityHref">) {
  const { close } = useAgentPanel()

  return (
    <header className="border-border-secondary dark:border-border-tertiary flex items-center gap-2 border-b px-4 py-3">
      <PiSparkle size={18} aria-hidden="true" className="text-ink-400 flex-none" />
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] leading-tight font-medium">
        {activityHref && (
          <>
            <Link href={activityHref} className="text-ink-450 hover:text-ink-100 flex-none transition-colors">
              Activity
            </Link>
            <span aria-hidden="true" className="bg-ink-300 size-1 flex-none rounded-full" />
          </>
        )}
        <h2 className="truncate">Sandworm agent</h2>
      </div>
      {close && (
        <button
          type="button"
          aria-label="Close the agent"
          onClick={close}
          className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg flex size-7 flex-none items-center justify-center rounded-lg transition-colors"
        >
          <PiX size={15} aria-hidden="true" />
        </button>
      )}
    </header>
  )
}
