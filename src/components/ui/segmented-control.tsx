"use client"

import { cn } from "@/lib/utils"

type SegmentedControlProps<T extends string> = {
  label: string
  options: { value: T; label: string }[]
  value?: T
  onChange: (value: T) => void
  // Fills the width it is given, each choice taking an equal share
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  fullWidth,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="segmented-control"
      className={cn(
        "bg-hover-bg border-hover-border dark:bg-sidebar-hover gap-0.5 rounded-xl border p-0.5",
        fullWidth ? "flex w-full" : "inline-flex flex-wrap self-start"
      )}
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
              fullWidth && "flex-1",
              "focus-visible:ring-primary/50 rounded-[10px] border px-3.5 py-1 text-[13px] transition-[background-color,border-color,color,box-shadow] duration-200 ease-out outline-none focus-visible:ring-2",
              isSelected
                ? "bg-block-surface border-hover-border text-ink-100 font-medium shadow-sm dark:bg-white/15 dark:shadow-none"
                : "text-ink-400 hover:text-ink-100 hover:border-hover-border border-transparent hover:bg-white/60 dark:hover:bg-white/10"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
