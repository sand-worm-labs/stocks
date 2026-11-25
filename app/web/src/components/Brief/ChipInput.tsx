"use client"

import { useState } from "react"

import { Pill } from "@/components/ui/pill"

type ChipInputProps = { label: string; placeholder: string; value: string[]; onChange: (value: string[]) => void }

export function ChipInput({ label, placeholder, value, onChange }: ChipInputProps) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const item = draft.trim()
    if (item && !value.some((other) => other.toLowerCase() === item.toLowerCase())) onChange([...value, item])
    setDraft("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((item) => (
        <Pill key={item} onRemove={() => onChange(value.filter((other) => other !== item))}>
          {item}
        </Pill>
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
        className="border-border placeholder:text-ink-400 focus:border-primary dark:border-border-tertiary h-[26px] w-36 rounded-[5px] border border-dashed bg-transparent px-2 text-xs transition-colors outline-none"
      />
    </div>
  )
}
