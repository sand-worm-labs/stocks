"use client"

import { INTERESTS, NOT_SURE } from "@/constants/onboarding"
import { cn } from "@/lib/utils"

import { ContinueButton } from "./ContinueButton"
import { StepHeading } from "./StepHeading"

type InterestStepProps = {
  name?: string
  value: string[]
  onChange: (value: string[]) => void
  onContinue: () => void
}

// What they want to invest in, as many as they like. "Not sure yet" is the way out: it stands alone, and any other choice
// takes it back.
export function InterestStep({ name, value, onChange, onContinue }: InterestStepProps) {
  const toggle = (id: string) => {
    if (id === NOT_SURE) return onChange(value.includes(NOT_SURE) ? [] : [NOT_SURE])
    const others = value.filter((current) => current !== NOT_SURE)
    onChange(others.includes(id) ? others.filter((current) => current !== id) : [...others, id])
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <StepHeading
        eyebrow={name ? `Welcome, ${name} · Your account is open` : "Your account is open"}
        title="What do you want to invest in?"
        support="Pick as many as you like."
      />
      <ul className="flex max-w-3xl flex-wrap justify-center gap-2">
        {INTERESTS.map(({ id, label, icon: Icon }, i) => {
          const selected = value.includes(id)
          return (
            <li key={id} className="animate-fade-up" style={{ "--index": i } as React.CSSProperties}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(id)}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-full border px-4 text-[15px] font-light transition-[background-color,border-color,color] duration-200 ease-out",
                  selected
                    ? "bg-base-400 border-transparent text-white dark:bg-white dark:text-black"
                    : "border-border bg-block-surface/70 hover:border-ink-300 dark:border-border-tertiary"
                )}
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3">
        <ContinueButton disabled={!value.length} onClick={onContinue} />
      </div>
    </div>
  )
}
