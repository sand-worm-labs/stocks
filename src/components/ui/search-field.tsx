"use client"

import { PiMagnifyingGlass, PiX } from "react-icons/pi"

import { cn } from "@/lib/utils"

type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  // "filled" for a bar in a toolbar, "raised" for a search that is the point of the page
  appearance?: "filled" | "raised"
  className?: string
}

// The web app's search field: a soft fill, a magnifier, and a button to clear what was typed
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  appearance = "filled",
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <PiMagnifyingGlass
        aria-hidden="true"
        className={cn(
          "text-ink-400 absolute top-1/2 -translate-y-1/2",
          appearance === "raised" ? "left-4 size-5" : "left-3 size-4"
        )}
      />
      <input
        type="text"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "placeholder:text-ink-300 w-full text-sm font-normal transition outline-none placeholder:font-normal",
          appearance === "filled"
            ? "bg-base-600 focus:ring-primary dark:bg-base-400 dark:border-border-tertiary h-10 rounded-lg border border-transparent pr-9 pl-9 focus:ring"
            : "bg-block-surface border-hover-border focus:border-primary dark:bg-chat-input-bg dark:border-chat-input-border h-12 rounded-full border-[1.5px] pr-11 pl-11 text-base shadow-[0_3.5px_24px_rgba(120,147,208,0.09)] dark:shadow-none"
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className={cn(
            "text-ink-400 hover:text-ink-100 hover:bg-hover-bg absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
            appearance === "raised" ? "right-3.5" : "right-2"
          )}
        >
          <PiX size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
