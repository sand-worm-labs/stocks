import { Fragment } from "react"
import { PiPlus, PiX } from "react-icons/pi"

import { fromList, JOINER, type Match, newComparison, toList } from "@/lib/strategy/condition"
import { describeCondition } from "@/lib/strategy/describe"
import { FRACTIONS } from "@/lib/strategy/explain"
import type { Comparison, Condition, Indicator, Reading } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

import { DecimalField, DEFAULT_DAYS, FIELD, INDICATORS, WholeField } from "./FilterFields"

type Change = (condition: Condition) => void

function ReadingFields({
  reading,
  stocks,
  label,
  onChange,
}: {
  reading: Reading
  stocks: string[]
  label: string
  onChange: (reading: Reading) => void
}) {
  const { symbol, indicator } = reading
  const days = "days" in indicator ? indicator.days : DEFAULT_DAYS

  return (
    <>
      <select
        aria-label={`${label} stock`}
        value={symbol}
        onChange={(event) => onChange({ symbol: event.target.value, indicator })}
        className={cn(FIELD, "h-8 max-w-[110px] pr-1 pl-2")}
      >
        {stocks.map((one) => (
          <option key={one} value={one}>
            {one}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} measure`}
        value={indicator.kind}
        onChange={(event) => {
          const kind = INDICATORS.find((one) => one.kind === event.target.value)?.kind ?? "price"
          onChange({ symbol, indicator: kind === "price" ? { kind } : { kind, days } })
        }}
        className={cn(FIELD, "h-8 max-w-[150px] pr-1 pl-2")}
      >
        {INDICATORS.map(({ kind, label: name }) => (
          <option key={kind} value={kind}>
            {name}
          </option>
        ))}
      </select>
      {indicator.kind !== "price" && (
        <>
          <WholeField
            value={days}
            label={`${label} days`}
            min={1}
            max={1000}
            onCommit={(next) => onChange({ symbol, indicator: { ...indicator, days: next } as Indicator })}
          />
          <span className="text-ink-400 text-sm">d</span>
        </>
      )}
    </>
  )
}

// The line between two conditions, with AND (all must hold) or OR (any one will do) sitting on it; pressing it flips the two
function Joiner({ match, onToggle }: { match: Match; onToggle: () => void }) {
  const word = match === "all" ? "And" : "Or"
  return (
    <div className="flex items-center gap-2" style={{ height: JOINER }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${word}: press to change whether all or any one of the conditions must hold`}
        className="border-border-secondary text-ink-400 hover:text-ink-100 nodrag nopan rounded-full border px-2 py-px text-[10px] leading-[14px] font-semibold tracking-wider uppercase transition-colors"
      >
        {word}
      </button>
      <span aria-hidden="true" className="bg-border-secondary h-px flex-1" />
    </div>
  )
}

function Row({
  row,
  stocks,
  index,
  onChange,
  onRemove,
}: {
  row: Comparison
  stocks: string[]
  index: number
  onChange: (row: Comparison) => void
  onRemove?: () => void
}) {
  const n = index + 1
  const against = "value" in row.right ? "number" : "stock"
  // What a percentage-like measure is typed as: 5 for 5%, though it is kept as 0.05
  const percent = FRACTIONS.has(row.left.indicator.kind)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-nowrap items-center gap-x-2 text-sm whitespace-nowrap">
        <ReadingFields
          reading={row.left}
          stocks={stocks}
          label={`Condition ${n}`}
          onChange={(left) => onChange({ ...row, left })}
        />
        <select
          aria-label={`Condition ${n} above or below`}
          value={row.op}
          onChange={(event) => onChange({ ...row, op: event.target.value === "<" ? "<" : ">" })}
          className={cn(FIELD, "h-8 pr-1 pl-2")}
        >
          <option value=">">is above</option>
          <option value="<">is below</option>
        </select>
        {"value" in row.right && (
          <>
            <DecimalField
              key={row.right.value}
              value={percent ? Math.round(row.right.value * 10000) / 100 : row.right.value}
              label={`Condition ${n} number`}
              onCommit={(next) => onChange({ ...row, right: { value: percent ? next / 100 : next } })}
            />
            {percent && <span className="text-ink-400">%</span>}
          </>
        )}
        <select
          aria-label={`Condition ${n} compared with`}
          value={against}
          onChange={(event) =>
            onChange({
              ...row,
              right:
                event.target.value === "number"
                  ? { value: 0 }
                  : { symbol: row.left.symbol, indicator: { kind: "sma", days: 50 } },
            })
          }
          className={cn(FIELD, "text-ink-400 h-8 pr-1 pl-2")}
        >
          <option value="number">a number</option>
          <option value="stock">another reading</option>
        </select>
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove condition ${n}`}
            onClick={onRemove}
            className="text-ink-400 nodrag nopan ml-auto flex size-7 flex-none items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-600"
          >
            <PiX aria-hidden="true" size={14} />
          </button>
        )}
      </div>
      {!("value" in row.right) && (
        <div className="flex flex-nowrap items-center gap-x-2 pl-3 text-sm whitespace-nowrap">
          <span className="text-ink-400">than</span>
          <ReadingFields
            reading={row.right}
            stocks={stocks}
            label={`Condition ${n} other`}
            onChange={(right) => onChange({ ...row, right })}
          />
        </div>
      )}
    </div>
  )
}

// What an if reads, as rows that can be changed: each comparison with every part a field, whether all of them or any one must
// hold, and a way to add and take out. A condition with a group inside a group is shown in words and left to the JSON.
export function ConditionFields({
  condition,
  choices,
  onChange,
}: {
  condition: Condition
  choices: string[]
  onChange: Change
}) {
  const list = toList(condition)
  const border = "border-border-secondary dark:border-border-tertiary border-t py-2.5 pr-4 pl-5"
  if (!list) {
    return (
      <div className={cn(border, "text-ink-400 flex flex-col gap-0.5 text-[13px]")}>
        <span>{describeCondition(condition)}</span>
        <span>This one has a group inside a group, so it is changed in the JSON.</span>
      </div>
    )
  }

  const { match, rows } = list
  const stocks = [
    ...new Set([
      ...choices,
      ...rows.flatMap(({ left, right }) => [left.symbol, "symbol" in right ? right.symbol : left.symbol]),
    ]),
  ]
  const set = (next: { match?: Match; rows?: Comparison[] }) => onChange(fromList({ match, rows, ...next }))

  return (
    <div className={cn(border, "flex flex-col gap-2.5")}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <Joiner match={match} onToggle={() => set({ match: match === "all" ? "any" : "all" })} />}
          <Row
            row={row}
            index={i}
            stocks={stocks}
            onChange={(next) => set({ rows: rows.map((one, j) => (j === i ? next : one)) })}
            onRemove={rows.length > 1 ? () => set({ rows: rows.filter((_, j) => j !== i) }) : undefined}
          />
        </Fragment>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set({ rows: [...rows, newComparison(stocks[0] ?? rows[0]?.left.symbol ?? "")] })}
          className="text-ink-400 hover:text-ink-100 border-hover-border nodrag nopan flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-xs transition-colors"
        >
          <PiPlus aria-hidden="true" size={11} />
          Add condition
        </button>
        {rows.length > 1 && (
          <span className="text-ink-400 flex items-center gap-2 text-xs">
            Needs
            <select
              aria-label="All or any of the conditions"
              value={match}
              onChange={(event) => set({ match: event.target.value === "any" ? "any" : "all" })}
              className={cn(FIELD, "h-8 pr-1 pl-2")}
            >
              <option value="all">all of them</option>
              <option value="any">any one of them</option>
            </select>
            to hold
          </span>
        )}
      </div>
    </div>
  )
}
