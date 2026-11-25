"use client"

import type { ReactNode } from "react"
import { PiPlus } from "react-icons/pi"

import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder"
import { cn } from "@/lib/utils"

type PromptBoxProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  prompts: readonly string[]
  controls: ReactNode
  className?: string
}

export function PromptBox({ id, label, value, onChange, onSubmit, prompts, controls, className }: PromptBoxProps) {
  const placeholder = useTypewriterPlaceholder(prompts, value.length === 0)

  return (
    <div
      className={cn(
        "border-hover-border bg-block-surface dark:border-chat-input-border dark:bg-chat-input-bg focus-within:border-primary relative flex min-h-[120px] w-full flex-col rounded-3xl border-[1.5px] shadow-[0_3.5px_24px_rgba(120,147,208,0.09)] transition-all duration-300 dark:shadow-none",
        className
      )}
    >
      {value.length === 0 && (
        <p
          aria-hidden="true"
          className="text-ink-300 dark:text-ink-400 pointer-events-none absolute top-4 right-5 left-5 text-sm break-words whitespace-pre-wrap"
        >
          {placeholder}
          <span className="bg-ink-300 dark:bg-ink-400 ml-0.5 inline-block h-[13px] w-px animate-pulse align-middle" />
        </p>
      )}
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            onSubmit?.()
          }
        }}
        className="field-sizing-content max-h-64 min-h-[4.5rem] w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        <button
          type="button"
          aria-label="Attach files"
          title="Attach files"
          className="border-border-cool text-ink-100 dark:text-ink-400 hover:bg-hover-bg hover:border-primary flex-none rounded-full border p-2.5 transition-colors dark:hover:bg-white/5"
        >
          <PiPlus size={18} />
        </button>
        <div className="flex min-w-0 items-center gap-2">{controls}</div>
      </div>
    </div>
  )
}
