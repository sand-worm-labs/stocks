"use client"

import { type ComponentType, useState } from "react"
import { PiBrain, PiChartBar, PiCircleNotch, PiCode, PiOctagon, PiTextT, PiWarningCircle } from "react-icons/pi"

import { cn } from "@/lib/utils"
import type { AgentBlock, RunPart, RunStatus } from "@/types/agent"

type SandwormRunBlockProps = { block: Extract<AgentBlock, { type: "sandworm-run" }> }
type Icon = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>

// The kinds of cell the agent writes, with the icon and the word the main Sandworm app's chat gives them
const CELL: Record<string, { label: string; icon: Icon }> = {
  python: { label: "Python", icon: PiCode },
  markdown: { label: "Markdown", icon: PiTextT },
  visualization: { label: "Chart", icon: PiChartBar },
  visualization_v2: { label: "Chart", icon: PiChartBar },
}

const STATUS_TEXT: Record<RunStatus, string> = {
  running: "Working in your notebook",
  done: "Finished",
  failed: "Stopped",
}

const ACTION_WORD = { making: "Writing", made: "Created", ran: "Ran" } as const

const PILL = "text-ink-400 dark:text-ink-300 border-border dark:border-border-tertiary bg-block-surface flex-none rounded-md border px-1.5 py-0.5 text-[10px] font-medium"

function Dots() {
  return (
    <span aria-hidden="true" className="ml-1 inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.22}s` }} className="block size-[3px] animate-pulse rounded-full bg-[#7F77DD]" />
      ))}
    </span>
  )
}

// A cell the agent is writing or has run: the same row the main Sandworm app's chat draws, with its kind and whether it is done
function ActionRow({ part }: { part: Extract<RunPart, { type: "action" }> }) {
  const cell = CELL[part.blockType?.toLowerCase() ?? ""]
  const Icon = cell?.icon ?? PiOctagon
  const isMaking = part.state === "making"

  return (
    <li data-item className="bg-hover-bg flex items-center gap-3 rounded-xl px-3 py-1.5 dark:bg-white/5">
      <span className="bg-block-surface flex size-6 flex-none items-center justify-center rounded-lg border border-[#B1DDE8] dark:border-[#1A3A52]">
        {isMaking ? <PiCircleNotch size={14} aria-hidden className="text-ink-400 animate-spin" /> : <Icon size={14} aria-hidden className="text-ink-200" />}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[12.5px] font-medium">
        <span className="text-ink-300 flex-none">{ACTION_WORD[part.state]}</span>
        <span className="truncate">{part.title}</span>
      </span>
      <span className={PILL}>{cell?.label ?? part.blockType ?? "Cell"}</span>
    </li>
  )
}

// What it is thinking, short and tucked away until opened, as in Sandworm's chat
function ThinkingRow({ text, isActive }: { text: string; isActive: boolean }) {
  const [isOpen, setOpen] = useState(false)
  return (
    <li data-item className="text-ink-400 flex flex-col gap-1 px-1 text-[12.5px]">
      <button type="button" onClick={() => setOpen((open) => !open)} aria-expanded={isOpen} className="hover:text-ink-100 flex w-fit items-center gap-2 transition-colors">
        <PiBrain size={15} aria-hidden="true" />
        {isActive ? "Thinking" : "Thought"}
        {isActive && <Dots />}
      </button>
      {isOpen && <p className="border-border-secondary dark:border-border-tertiary border-l-2 pl-3 leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>}
    </li>
  )
}

function Row({ part, isActive }: { part: RunPart; isActive: boolean }) {
  switch (part.type) {
    case "thinking":
      return <ThinkingRow text={part.text} isActive={isActive} />
    case "action":
      return <ActionRow part={part} />
    case "text":
      return <li data-item className="text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{part.text}</li>
    case "asked":
      return (
        <li data-item className="text-ink-400 border-border-secondary dark:border-border-tertiary border-t pt-2 text-xs leading-5 [overflow-wrap:anywhere]">
          <span className="font-medium">Stocks asked it to put that right:</span> {part.text}
        </li>
      )
    case "error":
      return (
        <li data-item className="flex items-center gap-2 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-[11.5px] text-red-700 dark:text-red-400">
          <PiWarningCircle size={14} aria-hidden="true" />
          {part.message}
        </li>
      )
  }
}

// Sandworm's agent at work, shown in the strategy's own chat so the person can follow it from here: what it thinks, which cells it writes and
// runs, and what it says, as it goes. The work itself is in the notebook, which is one click away.
export function SandwormRunBlock({ block: { status, notebookUrl, runner, parts } }: SandwormRunBlockProps) {
  const isRunning = status === "running"

  return (
    <section
      data-block
      aria-label={runner === "agent" ? "Your agent at work" : "Sandworm's agent at work"}
      className="bg-block-surface border-border-secondary dark:border-border-tertiary flex w-full flex-col gap-2 rounded-2xl rounded-bl-sm border px-3 py-2.5"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12.5px] font-medium">
          <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-full", isRunning ? "animate-pulse bg-emerald-500" : status === "done" ? "bg-emerald-600" : "bg-red-600")} />
          {runner === "agent" ? "Your agent" : "Sandworm's agent"}
          <span role="status" className="text-ink-400 font-normal">{STATUS_TEXT[status]}</span>
        </span>
        {notebookUrl && (
          <a href={notebookUrl} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-ink-100 text-xs whitespace-nowrap transition-colors">
            Open notebook ↗
          </a>
        )}
      </header>

      {parts.length === 0 ? (
        <p className="text-ink-400 flex items-center text-[12.5px]">
          Getting started
          {isRunning && <Dots />}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {parts.map((part, index) => (
            <Row key={index} part={part} isActive={isRunning && index === parts.length - 1} />
          ))}
        </ol>
      )}
    </section>
  )
}
