"use client"

import { useState } from "react"
import { PiCheckBold, PiPlus } from "react-icons/pi"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SearchField } from "@/components/ui/search-field"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { BenchmarkLine } from "@/lib/benchmarks/compare"
import { BENCHMARK_GROUPS } from "@/lib/benchmarks/types"
import { formatPercent } from "@/lib/format"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

type PickedFund = { id: string; color: string }

type BenchmarkPickerProps = {
  lines: BenchmarkLine[]
  picked: PickedFund[]
  max: number
  onToggle: (id: string) => void
}

const matches = ({ id, name, fund, group }: BenchmarkLine, query: string) =>
  `${id} ${name} ${fund} ${group}`.toLowerCase().includes(query.trim().toLowerCase())

// A list of index funds and ETFs to compare the portfolio with, by group and searchable, each with how it did. Picking
// one adds it to the chart; at the most, picking another takes the oldest off.
export function BenchmarkPicker({ lines, picked, max, onToggle }: BenchmarkPickerProps) {
  const [query, setQuery] = useState("")
  const found = lines.filter((line) => matches(line, query))

  return (
    <Popover onOpenChange={(open) => open || setQuery("")}>
      <PopoverTrigger className="border-border-secondary text-ink-200 hover:text-ink-100 hover:bg-hover-bg dark:border-border-tertiary focus-visible:ring-mark/50 inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2">
        <PiPlus aria-hidden="true" size={14} />
        Compare
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(380px,calc(100vw-2rem))] p-0">
        <div className="p-3 pb-2">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search index funds and ETFs"
            placeholder="Search funds, tickers, sectors..."
            appearance="card"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-1.5 pb-1.5">
          {BENCHMARK_GROUPS.map((group) => {
            const rows = found.filter((line) => line.group === group)
            if (!rows.length) return null

            return (
              <div key={group} className="pb-1">
                <p className="text-ink-400 px-2.5 pt-2 pb-1 text-xs font-medium">{group}</p>
                {rows.map((line) => {
                  const slot = picked.find(({ id }) => id === line.id)

                  return (
                    <button
                      key={line.id}
                      type="button"
                      aria-pressed={Boolean(slot)}
                      title={line.fund}
                      onClick={() => onToggle(line.id)}
                      className="hover:bg-hover-bg dark:hover:bg-dropdown-hover focus-visible:bg-hover-bg flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none"
                    >
                      <span
                        aria-hidden="true"
                        style={slot ? { backgroundColor: slot.color, borderColor: slot.color } : undefined}
                        className={cn(
                          "flex size-4 flex-none items-center justify-center rounded-[4px] border text-white",
                          !slot && "dark:border-border-tertiary border-[#D0D5DD]"
                        )}
                      >
                        {slot && <PiCheckBold size={10} />}
                      </span>
                      <span className="flex-1 truncate">{line.name}</span>
                      <span className="text-ink-400 font-tertiary text-xs">{line.id}</span>
                      <span
                        className={cn("w-14 text-right tabular-nums", TONE_TEXT_CLASSNAME[changeTone(line.change)])}
                      >
                        {formatPercent(line.change, { signed: true })}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {!found.length && <p className="text-ink-400 px-2.5 py-6 text-center text-sm">No fund matches.</p>}
        </div>
        <p className="text-ink-400 border-border-secondary dark:border-border-tertiary border-t px-4 py-2.5 text-xs">
          {picked.length} of {max} on the chart. Picking another takes the oldest off.
        </p>
      </PopoverContent>
    </Popover>
  )
}
