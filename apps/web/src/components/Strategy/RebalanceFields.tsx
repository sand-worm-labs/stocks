import { FIELD } from "@/constants/components/strategy/filter-fields"
import { EVERY } from "@/constants/components/strategy/rebalance-fields"
import { cn } from "@/lib/utils"
import type { Schedule } from "@/types/strategy"

import { WholeField } from "./FilterFields"

export function RebalanceFields({
  drift,
  every,
  onChange,
}: {
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
