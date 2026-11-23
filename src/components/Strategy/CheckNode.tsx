import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { PiHandPalm, PiLightning, PiPaperPlaneTilt, PiShieldCheck, PiShieldWarning } from "react-icons/pi"

import { CHECK_WIDTH, type CheckData, type CheckState } from "@/lib/rules/flow"
import { cn } from "@/lib/utils"

const TONE: Record<CheckState, { tint: string; bar: string; word: string }> = {
  holds: {
    tint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-600",
    word: "Holds",
  },
  watch: {
    tint: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    word: "Watch",
  },
  broken: {
    tint: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-600",
    word: "Broken",
  },
}

const NEUTRAL = "border-border-secondary bg-hover-bg text-ink-100 dark:border-border-tertiary"
const HANDLE = "!size-2.5 !border-2 !border-block-surface !bg-ink-400"

// One step a trade goes through, a bar like a strategy's: what it is, what it says now, and for a rule how close the portfolio
// is to its line, drawn along the bottom
export function CheckNode({ data }: NodeProps<Node<CheckData, "check">>) {
  const { kind, title, detail, state, closeness } = data
  const tone = TONE[state]
  const Icon =
    kind === "decide"
      ? PiLightning
      : kind === "approval"
        ? PiHandPalm
        : kind === "orders"
          ? PiPaperPlaneTilt
          : state === "broken"
            ? PiShieldWarning
            : PiShieldCheck
  const coloured = kind === "rule" || kind === "orders"
  const word = kind === "rule" ? tone.word : kind === "orders" ? (state === "broken" ? "Blocked" : "Ready") : undefined

  return (
    <div
      style={{ width: CHECK_WIDTH }}
      className="animate-fade-up bg-block-surface border-border-secondary dark:border-border-tertiary relative overflow-hidden rounded-xl border shadow-sm"
    >
      {kind !== "decide" && <Handle type="target" position={Position.Top} className={HANDLE} />}
      {kind !== "orders" && <Handle type="source" position={Position.Bottom} className={HANDLE} />}
      <div className="flex items-center gap-3 py-2 pr-4 pl-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 flex-none items-center justify-center rounded-lg border",
            coloured ? tone.tint : NEUTRAL
          )}
        >
          <Icon size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
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
