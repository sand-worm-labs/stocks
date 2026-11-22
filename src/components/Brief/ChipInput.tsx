"use client"

import { useState } from "react"
import { PiX } from "react-icons/pi"

type ChipInputProps = { label: string; placeholder: string; value: string[]; onChange: (value: string[]) => void }

export function ChipInput({ label, placeholder, value, onChange }: ChipInputProps) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const item = draft.trim()
    if (item && !value.includes(item)) onChange([...value, item])
    setDraft("")
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((item) => (
        <span
          key={item}
          className="bg-inputBg inline-flex min-h-[34px] items-center gap-1.5 rounded-full pr-2 pl-3 text-[13px] dark:bg-white/10"
        >
          {item}
          <button
            type="button"
            aria-label={`Remove ${item}`}
            onClick={() => onChange(value.filter((other) => other !== item))}
            className="text-ink-400 hover:text-ink-100 rounded-full p-0.5 transition-colors"
          >
            <PiX size={10} />
          </button>
        </span>
      ))}
      <input
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            add()
          }
        }}
        className="border-border placeholder:text-ink-400 focus:border-primary dark:border-border-tertiary min-h-[34px] w-36 rounded-full border border-dashed bg-transparent px-3 text-[13px] transition-colors outline-none"
      />
    </div>
  )
}
