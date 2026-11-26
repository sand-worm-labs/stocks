"use client"

import { PiCheckCircleFill, PiCircleNotch, PiProhibit, PiWarningCircleFill } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"
import type { AgentBlock, ProposalStatus } from "@/types/agent"

import { BlockFrame } from "./BlockFrame"
import { useAgent } from "../AgentContext"

type ProposalBlockProps = { block: Extract<AgentBlock, { type: "proposal" }> }

// What a step that is decided says of itself, so an old card in the conversation reads as what happened, not as a button to press
const OUTCOME: Record<Exclude<ProposalStatus, "pending" | "working">, { text: string; icon: typeof PiCheckCircleFill; className: string }> = {
  done: { text: "Done", icon: PiCheckCircleFill, className: "text-emerald-700 dark:text-emerald-400" },
  cancelled: { text: "Cancelled", icon: PiProhibit, className: "text-ink-400" },
  failed: { text: "Didn't go through", icon: PiWarningCircleFill, className: "text-red-700 dark:text-red-400" },
}

export function ProposalBlock({ block: { id, title, rows, status, confirmLabel } }: ProposalBlockProps) {
  const { decide } = useAgent()
  const isWorking = status === "working"
  const outcome = status === "pending" || isWorking ? undefined : OUTCOME[status]
  const Icon = outcome?.icon

  return (
    <BlockFrame title={title} aside={status === "pending" ? "Needs your OK" : undefined}>
      <dl>
        {rows.map(({ label, term, value }) => (
          <div
            key={`${label}-${term ?? ""}`}
            data-item
            className="border-border-secondary dark:border-border-tertiary flex items-center justify-between gap-3 border-t px-3 py-2 text-[13px] first:border-t-0"
          >
            <dt className="flex flex-col">
              <span className="text-ink-200">{label}</span>
              {term && <span className="text-ink-300 text-xs">{term}</span>}
            </dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="border-border-secondary dark:border-border-tertiary flex items-center gap-2 border-t px-3 py-2.5">
        {outcome && Icon && (
          <span role="status" className={cn("flex items-center gap-1.5 text-[13px] font-medium", outcome.className)}>
            <Icon aria-hidden="true" size={15} />
            {outcome.text}
          </span>
        )}
        {(status === "pending" || isWorking) && (
          <>
            <button
              type="button"
              disabled={isWorking || !decide}
              aria-busy={isWorking}
              onClick={() => decide?.(id, "confirm")}
              className={cn(buttonVariants({ intent: "dark", size: "compact" }), "gap-1.5 disabled:cursor-wait disabled:opacity-70")}
            >
              {isWorking && <PiCircleNotch aria-hidden="true" size={14} className="animate-spin" />}
              {isWorking ? "Working…" : confirmLabel}
            </button>
            <button
              type="button"
              disabled={isWorking || !decide}
              onClick={() => decide?.(id, "cancel")}
              className={cn(buttonVariants({ intent: "outline", size: "compact" }), "disabled:opacity-50")}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </BlockFrame>
  )
}
