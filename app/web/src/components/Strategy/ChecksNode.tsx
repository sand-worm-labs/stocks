import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { use } from "react"
import { PiListChecks, PiSignOut } from "react-icons/pi"

import { RAIL } from "@/constants/components/strategy/checks-node"
import { HANDLE } from "@/constants/components/strategy/shared"
import { CHECK_WIDTH, type CheckData } from "@/lib/rules/flow"
import { cn } from "@/lib/utils"

import { HoverContext, isLit } from "./BlockNode"

export function ChecksNode({ id, data }: NodeProps<Node<CheckData, "checks">>) {
  const hovered = use(HoverContext)
  const { title, detail, count = 0, brokenCount = 0, tag = "Rules", noun = "rule", exit = false } = data

  return (
    <div
      style={{
        width: CHECK_WIDTH,
        filter: `opacity(${isLit(id, hovered) ? 1 : 0.28})`,
        transition: "filter 200ms, box-shadow 150ms",
      }}
      className={cn(
        "animate-fade-up relative rounded-xl border shadow-sm hover:shadow-lg",
        exit ? "border-red-500/40 bg-red-50 dark:bg-red-950/40" : "border-teal-500/40 bg-teal-50 dark:bg-teal-950/30"
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", exit ? "bg-red-500" : "bg-teal-500")}
      />
      <Handle type="target" position={Position.Left} className={HANDLE} />
      <Handle type="source" position={Position.Bottom} style={{ left: RAIL }} className={HANDLE} />
      <div className="flex items-center gap-3 py-2 pr-4 pl-5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 flex-none items-center justify-center rounded-lg border",
            exit
              ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
              : "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400"
          )}
        >
          {exit ? <PiSignOut size={18} /> : <PiListChecks size={18} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-sm font-medium">{title}</span>
          {detail && <span className="text-ink-400 text-[13px]">{detail}</span>}
        </div>
        <span
          className={cn(
            "flex-none rounded-full px-2 py-0.5 text-[11px] font-medium",
            brokenCount
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          )}
        >
          {brokenCount
            ? `${brokenCount} of ${count} broken`
            : `${count} ${count === 1 ? noun : `${noun}s`}${noun === "rule" ? " hold" : ""}`}
        </span>
        <span className="border-border-secondary text-ink-400 dark:border-border-tertiary flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
          {tag}
        </span>
      </div>
    </div>
  )
}
