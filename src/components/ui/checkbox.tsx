"use client"

import { cn } from "@/lib/utils"

type CheckboxProps = {
  checked: boolean
  onChange: () => void
  "aria-label": string
  disabled?: boolean
  className?: string
}

// The web app's checkbox: a small square with a violet outline, and a violet tick when it is checked
export function Checkbox({ checked, onChange, disabled, className, ...rest }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer absolute inset-0 size-4 cursor-pointer opacity-0 disabled:cursor-default"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cn(
          "bg-block-surface flex size-4 items-center justify-center rounded-[4px] border transition-colors duration-150",
          "peer-focus-visible:outline-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          checked ? "border-[#7F56D9]" : "dark:border-border-tertiary border-[#D0D5DD]",
          disabled && "opacity-60"
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" className="size-3.5">
            <path
              d="M2.5 6.2L4.8 8.5L9.5 3.5"
              stroke="#7F56D9"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </span>
  )
}
