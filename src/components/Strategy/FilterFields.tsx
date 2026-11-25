import { useState } from "react"
import { PiPlus, PiX } from "react-icons/pi"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { DEFAULT_DAYS, FIELD, INDICATORS } from "@/constants/components/strategy/filter-fields"
import type { FilterBlock, FilterChange } from "@/lib/strategy/edit"
import { cn } from "@/lib/utils"
import type { Indicator } from "@/types/strategy"

// A whole number that is typed in, taken when Enter is pressed or the field is left; a wrong entry goes back to what it was
export function WholeField({
  value,
  label,
  min,
  max,
  onCommit,
}: {
  value: number
  label: string
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const commit = () => {
    const next = Number(draft)
    if (draft.trim() === "" || !Number.isFinite(next)) return setDraft(String(value))
    const clamped = Math.min(Math.max(Math.round(next), min), max)
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
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
      className={cn(FIELD, "h-8 w-12 px-1 text-center tabular-nums")}
    />
  )
}

export function FilterFields({ filter, onChange }: { filter: FilterBlock; onChange: (change: FilterChange) => void }) {
  const { pick, count, by } = filter
  const days = "days" in by ? by.days : DEFAULT_DAYS

  return (
    <div className="flex flex-nowrap items-center gap-x-2.5 text-sm whitespace-nowrap">
      <select
        aria-label="Best or worst"
        value={pick}
        onChange={(event) => onChange({ pick: event.target.value === "bottom" ? "bottom" : "top" })}
        className={cn(FIELD, "h-8 pr-1 pl-2")}
      >
        <option value="top">Best</option>
        <option value="bottom">Worst</option>
      </select>
      <WholeField
        value={count}
        label="How many to pick"
        min={1}
        max={99}
        onCommit={(next) => onChange({ count: next })}
      />
      <span className="text-ink-400">by</span>
      <select
        aria-label="Measure"
        value={by.kind}
        onChange={(event) => {
          const kind = INDICATORS.find((one) => one.kind === event.target.value)?.kind ?? "return"
          onChange({ by: kind === "price" ? { kind } : { kind, days } })
        }}
        className={cn(FIELD, "h-8 max-w-[150px] pr-1 pl-2")}
      >
        {INDICATORS.map(({ kind, label }) => (
          <option key={kind} value={kind}>
            {label}
          </option>
        ))}
      </select>
      {by.kind !== "price" && (
        <>
          <WholeField
            value={days}
            label="Days"
            min={1}
            max={1000}
            onCommit={(next) => onChange({ by: { ...by, days: next } as Indicator })}
          />
          <span className="text-ink-400">days</span>
        </>
      )}
    </div>
  )
}

export function FilterPool({
  filter,
  choices,
  onChange,
}: {
  filter: FilterBlock
  choices: string[]
  onChange: (change: FilterChange) => void
}) {
  const left = choices.filter((symbol) => !filter.from.includes(symbol))

  return (
    <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap items-center gap-x-2 gap-y-2 border-t py-2.5 pr-4 pl-5">
      <span className="text-ink-400 mr-1 text-xs">Choosing from</span>
      {filter.from.map((symbol) => (
        <span
          key={symbol}
          className="group/tag bg-hover-bg border-hover-border flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs font-medium dark:bg-white/5"
        >
          <StockAvatar symbol={symbol} className="size-5" />
          {symbol}
          {filter.from.length > 1 && (
            <button
              type="button"
              aria-label={`Take ${symbol} out`}
              onClick={() => onChange({ from: filter.from.filter((one) => one !== symbol) })}
              className="text-ink-400 nodrag nopan -mr-1.5 flex size-4 items-center justify-center rounded-full opacity-0 transition group-hover/tag:opacity-100 hover:bg-red-500/10 hover:text-red-600 focus-visible:opacity-100 pointer-coarse:opacity-100"
            >
              <PiX aria-hidden="true" size={10} />
            </button>
          )}
        </span>
      ))}
      {left.length > 0 && (
        <label className="text-ink-400 hover:text-ink-100 border-hover-border nodrag nopan relative flex cursor-pointer items-center gap-1 rounded-full border border-dashed py-1 pr-2.5 pl-2 text-xs transition-colors">
          <PiPlus aria-hidden="true" size={11} />
          <select
            aria-label="Add a stock to choose from"
            value=""
            onChange={(event) => event.target.value && onChange({ from: [...filter.from, event.target.value] })}
            className="w-[58px] cursor-pointer appearance-none bg-transparent outline-none"
          >
            <option value="">Add</option>
            {left.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="nodrag nopan ml-auto flex items-center gap-2">
        <span className="text-ink-400 text-xs">Then</span>
        <SegmentedControl
          label="How the picks are weighted"
          value={filter.weighting ?? "equal"}
          onChange={(weighting) => onChange({ weighting })}
          options={[
            { value: "equal", label: "Equal" },
            { value: "inverse-volatility", label: "Steadier gets more" },
          ]}
        />
      </div>
    </div>
  )
}

export function DecimalField({
  value,
  label,
  onCommit,
}: {
  value: number
  label: string
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const commit = () => {
    const next = Number(draft)
    if (draft.trim() === "" || !Number.isFinite(next)) return setDraft(String(value))
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }

  return (
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
      className={cn(FIELD, "h-8 w-16 px-1.5 text-right tabular-nums")}
    />
  )
}
