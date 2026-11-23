import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { PiCaretDown, PiCaretRight } from "react-icons/pi"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { BLOCK_WIDTH, type BlockData } from "@/lib/strategy/flow/graph"
import { cn } from "@/lib/utils"

import { BLOCK_STYLE } from "./blocks"

// How far in from a block's left edge the line to what is under it leaves, so it runs down the gap before the next level
const RAIL = 20

const HANDLE = "!size-2.5 !border-2 !border-block-surface !bg-ink-400"

// What the canvas adds to a block it draws: the way to fold it
export type BlockNodeData = BlockData & { onFold?: () => void }

// One block, a bar across the page that reads like a sentence: what kind it is, what it is, what it decides. It joins the one
// above it on its left, and the ones it holds are set in under it; an if has two ways out, then and else.
export function BlockNode({ data, positionAbsoluteY }: NodeProps<Node<BlockNodeData, "block">>) {
  const { block, title, detail, chips, foldable, folded, hidden, onFold } = data
  const { label, icon: Icon, tint, accent } = BLOCK_STYLE[block]
  const leaf = block === "asset" || block === "cash" || block === "filter"

  return (
    <div
      style={{ width: BLOCK_WIDTH, "--index": Math.round(positionAbsoluteY / 80) } as React.CSSProperties}
      className="animate-fade-up bg-block-surface border-border-secondary dark:border-border-tertiary relative rounded-xl border shadow-sm transition-shadow hover:shadow-lg"
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", accent)} />
      {block !== "start" && <Handle type="target" position={Position.Left} className={HANDLE} />}
      {block === "if" ? (
        <>
          <Handle
            id="then"
            type="source"
            position={Position.Bottom}
            style={{ left: RAIL }}
            className={cn(HANDLE, "!bg-emerald-500")}
          />
          <Handle
            id="else"
            type="source"
            position={Position.Bottom}
            style={{ left: RAIL + 16 }}
            className={cn(HANDLE, "!bg-red-500")}
          />
        </>
      ) : (
        !leaf &&
        (foldable || block === "start") && (
          <Handle type="source" position={Position.Bottom} style={{ left: RAIL }} className={HANDLE} />
        )
      )}

      <div className="flex items-center gap-3 py-2 pr-3 pl-5">
        {block === "asset" ? (
          <StockAvatar symbol={title} className="size-8 flex-none" />
        ) : (
          <span
            aria-hidden="true"
            className={cn("flex size-8 flex-none items-center justify-center rounded-lg border", tint)}
          >
            <Icon size={18} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-sm font-medium">{title}</span>
          {detail && <span className="text-ink-400 text-[13px]">{detail}</span>}
        </div>
        {folded && hidden ? (
          <span className="bg-hover-bg text-ink-400 flex-none rounded-full px-2 py-0.5 text-[11px] dark:bg-white/5">
            +{hidden} inside
          </span>
        ) : null}
        <span className="border-border-secondary text-ink-400 dark:border-border-tertiary flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
        {foldable && onFold && (
          <button
            type="button"
            aria-label={folded ? `Unfold ${title}` : `Fold ${title}`}
            aria-expanded={!folded}
            onClick={onFold}
            className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg nodrag flex size-6 flex-none items-center justify-center rounded-md transition-colors"
          >
            {folded ? <PiCaretRight aria-hidden="true" size={14} /> : <PiCaretDown aria-hidden="true" size={14} />}
          </button>
        )}
      </div>

      {chips && (
        <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap gap-1.5 border-t py-2 pr-4 pl-5">
          {chips.map(({ symbol, note }) => (
            <span
              key={symbol}
              className="bg-hover-bg flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 text-[11px] dark:bg-white/5"
            >
              <StockAvatar symbol={symbol} className="size-4" />
              {symbol}
              {note && <span className="text-ink-400 tabular-nums">{note}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
