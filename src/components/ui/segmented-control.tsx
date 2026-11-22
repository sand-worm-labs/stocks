"use client"

import { cn } from "@/lib/utils"

type SegmentedControlProps<T extends string> = {
  label: string
  options: { value: T; label: string }[]
  value?: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="segmented-control"
      className="bg-inputBg inline-flex flex-wrap self-start rounded-[10px] p-[3px] dark:bg-white/5"
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-visible:ring-primary/50 rounded-lg px-3 py-1.5 text-[13px] transition-colors outline-none focus-visible:ring-2",
              isSelected
                ? "bg-block-surface text-ink-100 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/10"
                : "text-ink-400 hover:text-ink-100"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
