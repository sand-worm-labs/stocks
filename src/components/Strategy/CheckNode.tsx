import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { use } from "react"
import { PiPaperPlaneTilt, PiShieldCheck, PiShieldWarning } from "react-icons/pi"

import { CHECK_WIDTH, type CheckData, type CheckState } from "@/lib/rules/flow"
import { cn } from "@/lib/utils"

import { HoverContext, isLit } from "./BlockNode"
import { LEADS } from "./leads"

const TONE: Record<CheckState, { tint: string; bar: string; word: string; card: string }> = {
  holds: {
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-600",
    word: "Holds",
    card: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
  },
  watch: {
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    word: "Watch",
    card: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
  },
  broken: {
    tint: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-600",
    word: "Broken",
    card: "border-red-500/40 bg-red-50 dark:bg-red-950/40",
  },
}

const EXIT_TONE = {
  tint: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  bar: "bg-red-500",
  word: "Watching",
  card: "border-red-500/40 bg-red-50 dark:bg-red-950/40",
}

const HANDLE = "!size-2.5 !border-2 !border-block-surface !bg-ink-400"

// One block of the rules, a bar like a strategy's, on the same board: a rule with how close the portfolio is to its line along
// the bottom, and the order that goes out last. The block they hang from is `ChecksNode`.
export function CheckNode({ id, data }: NodeProps<Node<CheckData, "check">>) {
  const hovered = use(HoverContext)
  const { kind, title, detail, lead, state, closeness, word: given, exit } = data
  // An exit wears the exits colour, red, like the block it hangs from
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
