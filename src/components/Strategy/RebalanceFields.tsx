import type { Schedule } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

import { FIELD, WholeField } from "./FilterFields"

const EVERY: { value: Schedule; label: string }[] = [
  { value: "daily", label: "daily" },
  { value: "weekly", label: "weekly" },
  { value: "monthly", label: "monthly" },
]

// The line a rebalance reads as, with each part of it a field: how many points a stock may drift, and how often it is looked at
export function RebalanceFields({
  drift,
  every,
  onChange,
}: {
  // A fraction of the portfolio
  drift: number
  every: Schedule
  onChange: (change: { drift?: number; every?: Schedule }) => void
}) {
  return (
    <>
      <span className="text-sm font-medium">Rebalance</span>
      <span className="text-ink-400 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        Back to target past
        <WholeField
          value={Math.round(drift * 100)}
          label="Points a stock may drift before a rebalance"
          min={1}
          max={50}
          onCommit={(points) => onChange({ drift: points / 100 })}
        />
        points, checked
        <select
          aria-label="How often a rebalance looks"
          value={every}
          onChange={(event) => onChange({ every: EVERY.find(({ value }) => value === event.target.value)?.value })}
          className={cn(FIELD, "h-8 pr-1 pl-2")}
        >
          {EVERY.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </span>
    </>
  )
}
