import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { createContext, type ReactNode, use, useState } from "react"
import { PiCaretDown, PiCaretRight, PiTrash } from "react-icons/pi"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import type { FilterChange } from "@/lib/strategy/edit"
import { BLOCK_WIDTH, type BlockData } from "@/lib/strategy/flow/graph"
import type { Condition, Schedule, Side, Via } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

import { BLOCK_STYLE } from "./blocks"
import { ConditionFields } from "./ConditionFields"
import { FIELD, FilterFields, FilterPool } from "./FilterFields"
import { RebalanceFields } from "./RebalanceFields"

// How far in from a block's left edge the line to what is under it leaves, so it runs down the gap before the next level
const RAIL = 20

const HANDLE = "!size-2.5 !border-2 !border-block-surface !bg-ink-400"

// The block the pointer is over, told to every block so each can dim itself without the canvas making new nodes
export const HoverContext = createContext<string | undefined>(undefined)

// A block is lit if it is the one hovered, on the way to it, or on the way on from it
export const isLit = (id: string, hovered?: string) =>
  !hovered ||
  hovered === "start" ||
  id === "start" ||
  // The rules come before everything the strategy does, so they are on the way to any of it
  (id === "checks" && !hovered.startsWith("orders")) ||
  id === hovered ||
  hovered.startsWith(`${id}.`) ||
  id.startsWith(`${hovered}.`)

// What the canvas adds to a block it draws: the way to fold it
export type BlockNodeData = BlockData & {
  onFold?: () => void
  // Only on a canvas that can be changed: the menu to add into this block, and the way to take it out
  adder?: ReactNode
  onRemove?: () => void
  // Only on a canvas that can be changed, and only on a block in a group that splits by shares: its share as a percentage, and
  // the way to change it. A group of nothing but stocks has its stocks as tags, and changes theirs by place.
  share?: number
  onShare?: (percent: number) => void
  onChipShare?: (index: number, percent: number) => void
  // Only on a filter, on a canvas that can be changed: the way to change any of what it says, and every stock it could choose from
  onFilter?: (change: FilterChange) => void
  // Only on a rebalance, on a canvas that can be changed: the way to change how far a stock may drift and how often it is looked at
  onRebalance?: (change: { drift?: number; every?: Schedule }) => void
  // Only on an if, on a canvas that can be changed: the way to change what it reads
  onCondition?: (condition: Condition) => void
  // Only on a stock, on a canvas that can be changed: the way to hold it long or short, as the token or through a perp
  onAsset?: (change: { side?: Side; via?: Via }) => void
  choices?: string[]
}

// A percentage that is typed in. It is changed when Enter is pressed or the field is left, not on every key, so a share can be
// typed through numbers that would not do (a 5 on the way to 50). A wrong or empty entry goes back to what it was.
function ShareField({
  value,
  label,
  onCommit,
  compact,
}: {
  value: number
  label: string
  onCommit: (percent: number) => void
  compact?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  const commit = () => {
    const next = Number(draft)
    if (draft.trim() === "" || !Number.isFinite(next)) return setDraft(String(value))
    const clamped = Math.min(Math.max(next, 0), 100)
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <label
      className={cn(
        "nodrag nopan bg-hover-bg focus-within:ring-mark flex flex-none items-center rounded-md tabular-nums focus-within:ring-1 dark:bg-white/10",
        compact ? "gap-0.5 px-1 text-[11px]" : "gap-0.5 px-1.5 py-0.5 text-[13px] font-medium"
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            setDraft(String(value))
            event.currentTarget.blur()
          }
        }}
        className={cn("bg-transparent text-right outline-none", compact ? "w-7" : "w-9")}
      />
      <span className="text-ink-400">%</span>
    </label>
  )
}

// One block, a bar across the page that reads like a sentence: what kind it is, what it is, what it decides. It joins the one
// above it on its left, and the ones it holds are set in under it; an if has two ways out, then and else.
export function BlockNode({ id, data, positionAbsoluteY }: NodeProps<Node<BlockNodeData, "block">>) {
  const hovered = use(HoverContext)
  const {
    block,
    title,
    detail,
    weightType,
    chips,
    foldable,
    folded,
    hidden,
    onFold,
    adder,
    onRemove,
    share,
    onShare,
    onChipShare,
    onFilter,
    onRebalance,
    onCondition,
    onAsset,
    choices,
    spec,
  } = data
  const { label, icon: Icon, tint, accent, card } = BLOCK_STYLE[block]
  const leaf = block === "asset" || block === "cash" || block === "filter"

  return (
    <div
      style={
        {
          width: BLOCK_WIDTH,
          "--index": Math.round(positionAbsoluteY / 80),
          // A filter, not opacity: the entrance animation holds opacity at 1 and would override it
          filter: `opacity(${isLit(id, hovered) ? 1 : 0.28})`,
          transition: "filter 200ms, box-shadow 150ms",
        } as React.CSSProperties
      }
      className={cn("group/block animate-fade-up relative rounded-xl border shadow-sm hover:shadow-lg", card)}
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
          {spec.type === "filter" && onFilter ? (
            <FilterFields filter={{ ...spec }} onChange={onFilter} />
          ) : spec.type === "rebalance" && onRebalance ? (
            <RebalanceFields drift={spec.drift} every={spec.every} onChange={onRebalance} />
          ) : (
            <>
              <span className="text-sm font-medium">{title}</span>
              {spec.type === "asset" && onAsset ? (
                <span className="flex items-center gap-2">
                  <select
                    aria-label={`${title} long or short`}
                    value={spec.side ?? "long"}
                    onChange={(event) => onAsset({ side: event.target.value === "short" ? "short" : "long" })}
                    className={cn(FIELD, "h-7 pr-1 pl-2")}
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                  <select
                    aria-label={`${title} spot or perp`}
                    value={spec.side === "short" ? "perp" : (spec.via ?? "spot")}
                    disabled={spec.side === "short"}
                    onChange={(event) => onAsset({ via: event.target.value === "perp" ? "perp" : "spot" })}
                    className={cn(FIELD, "h-7 pr-1 pl-2 disabled:opacity-60")}
                  >
                    <option value="spot">Spot token</option>
                    <option value="perp">Perp</option>
                  </select>
                </span>
              ) : (
                detail &&
                !(spec.type === "if" && onCondition) && <span className="text-ink-400 text-[13px]">{detail}</span>
              )}
            </>
          )}
        </div>
        {folded && hidden ? (
          <span className="bg-hover-bg text-ink-400 flex-none rounded-full px-2 py-0.5 text-[11px] dark:bg-white/5">
            +{hidden} inside
          </span>
        ) : null}
        {share !== undefined && onShare && (
          <ShareField key={share} value={share} label={`Share of ${title}`} onCommit={onShare} />
        )}
        {weightType && !(spec.type === "filter" && onFilter) && (
          <span className="bg-hover-bg text-ink-100 flex-none rounded-full px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">
            {weightType}
          </span>
        )}
        <span className="border-border-secondary text-ink-400 dark:border-border-tertiary flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${title}`}
            onClick={onRemove}
            className="text-ink-400 nodrag nopan flex size-6 flex-none items-center justify-center rounded-md opacity-0 transition group-hover/block:opacity-100 hover:bg-red-500/10 hover:text-red-600 focus-visible:opacity-100 pointer-coarse:opacity-100"
          >
            <PiTrash aria-hidden="true" size={14} />
          </button>
        )}
        {adder}
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

      {spec.type === "if" && onCondition && !folded ? (
        <ConditionFields condition={spec.condition} choices={choices ?? []} onChange={onCondition} />
      ) : null}

      {spec.type === "filter" && onFilter ? (
        <FilterPool filter={{ ...spec }} choices={choices ?? []} onChange={onFilter} />
      ) : (
        chips && (
          <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap gap-1.5 border-t py-2 pr-4 pl-5">
            {chips.map(({ symbol, note, percent }, i) => (
              <span
                key={`${symbol}.${i}`}
                className="bg-hover-bg flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 text-[11px] dark:bg-white/5"
              >
                <StockAvatar symbol={symbol} className="size-4" />
                {symbol}
                {percent !== undefined && onChipShare ? (
                  <ShareField
                    key={percent}
                    compact
                    value={percent}
                    label={`Share of ${symbol}`}
                    onCommit={(next) => onChipShare(i, next)}
                  />
                ) : (
                  note && <span className="text-ink-400 tabular-nums">{note}</span>
                )}
              </span>
            ))}
          </div>
        )
      )}
    </div>
  )
}
