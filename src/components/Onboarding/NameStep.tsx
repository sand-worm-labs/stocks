"use client"

import { NAME_MAX_LENGTH } from "@/constants/onboarding"

import { ContinueButton } from "./ContinueButton"
import { StepHeading } from "./StepHeading"

type NameStepProps = { value: string; onChange: (value: string) => void; onContinue: () => void; pending: boolean }

export function NameStep({ value, onChange, onContinue, pending }: NameStepProps) {
  const ready = value.trim().length > 0

  return (
    <form
      className="flex w-full max-w-4xl flex-col items-center gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onContinue()
      }}
    >
      <StepHeading
        title="What should we call you?"
        support="The agent uses it when it writes to you. You can change it in settings."
      />
      <input
        type="text"
        aria-label="Your name"
        autoFocus
        autoComplete="given-name"
        maxLength={NAME_MAX_LENGTH}
        placeholder="Your name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-block-surface border-hover-border focus:border-primary dark:border-border-tertiary placeholder:text-ink-300 h-12 w-full max-w-[360px] rounded-full border-[1.5px] px-6 text-center text-lg shadow-[0_3.5px_24px_rgba(120,147,208,0.09)] outline-none dark:shadow-none"
      />
      <div className="mt-8">
        <ContinueButton type="submit" disabled={!ready || pending} />
      </div>
    </form>
  )
}
