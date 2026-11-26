import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { use } from "react"
import { PiPaperPlaneTilt, PiShieldCheck, PiShieldWarning } from "react-icons/pi"

import { EXIT_TONE, TONE } from "@/constants/components/strategy/check-node"
import { HANDLE } from "@/constants/components/strategy/shared"
import { CHECK_WIDTH, type CheckData } from "@/lib/rules/flow"
import { cn } from "@/lib/utils"

import { HoverContext, isLit } from "./BlockNode"
import { LEADS } from "./leads"

export function CheckNode({ id, data }: NodeProps<Node<CheckData, "check">>) {
  const hovered = use(HoverContext)
  const { kind, title, detail, lead, state, closeness, word: given, exit } = data
  const tone = exit ? EXIT_TONE : TONE[state]
  const Icon = kind === "orders" ? PiPaperPlaneTilt : state === "broken" ? PiShieldWarning : PiShieldCheck
  const word =
    given ?? (kind === "rule" ? tone.word : kind === "orders" ? (state === "broken" ? "Blocked" : "Ready") : undefined)

  return (
    <div
      style={{
        width: CHECK_WIDTH,
        filter: `opacity(${isLit(id, hovered) ? 1 : 0.28})`,
        transition: "filter 200ms, box-shadow 150ms",
      }}
      className={cn("animate-fade-up relative overflow-hidden rounded-xl border shadow-sm hover:shadow-lg", tone.card)}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", tone.bar)} />
      <Handle type="target" position={Position.Left} className={HANDLE} />
      <div className="flex items-center gap-3 py-2 pr-4 pl-5">
        <span
          aria-hidden="true"
          className={cn("flex size-8 flex-none items-center justify-center rounded-lg border", tone.tint)}
        >
          <Icon size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {lead && (
            <span
              className={cn(
                "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
                LEADS[lead].className
              )}
            >
              {lead}
            </span>
          )}
          <span className="text-sm font-medium">{title}</span>
          {detail && <span className="text-ink-400 text-[13px]">{detail}</span>}
        </div>
        {word && (
          <span
            className={cn(
              "flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase",
              tone.tint
            )}
          >
            {word}
          </span>
        )}
      </div>
      {closeness !== undefined && (
        <span
          aria-hidden="true"
          style={{ width: `${Math.min(closeness, 1) * 100}%` }}
          className={cn("absolute bottom-0 left-0 h-0.5", tone.bar)}
        />
      )}
    </div>
  )
}
