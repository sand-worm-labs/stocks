"use client"

import { cn } from "@/lib/utils"

type Choice<T extends string | number> = { value: T; label: string }

type ChoiceChipsProps<T extends string | number> = {
  choices: Choice<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  fill?: boolean
}

export function ChoiceChips<T extends string | number>({ choices, value, onChange, label, fill }: ChoiceChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={choice.value === value}
          onClick={() => onChange(choice.value)}
          className={cn(
            "border text-xs font-medium transition-colors",
            fill ? "flex-1 rounded-[10px] py-2.5 text-[13px]" : "rounded-full px-3 py-1",
            choice.value === value
              ? "bg-primary-tint-75 border-primary-200 text-primary dark:bg-primary/15 dark:border-primary/40"
              : "text-ink-200 border-border-secondary dark:border-border-tertiary hover:bg-hover-bg"
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}
