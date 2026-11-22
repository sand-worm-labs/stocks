"use client"

import type { Starter } from "@/lib/onboarding/types"

import { ContinueButton } from "./ContinueButton"
import { StarterCard } from "./StarterCard"
import { StepHeading } from "./StepHeading"

type StarterStepProps = {
  starters: Starter[]
  selected: string | undefined
  onSelect: (id: string) => void
  onContinue: () => void
  onExplore: () => void
  pending: boolean
}

// Briefs to start from, for what they said they like. Choosing one opens the new portfolio with it already written; or
// they can look at the stocks themselves.
export function StarterStep({ starters, selected, onSelect, onContinue, onExplore, pending }: StarterStepProps) {
  return (
    <div className="flex w-full max-w-[960px] flex-col items-center gap-3">
      <StepHeading title="A place to start" support="Based on what you picked." />
      <div className="mt-1 grid w-full gap-4 md:grid-cols-3">
        {starters.map((starter, i) => (
          <StarterCard
            key={starter.id}
            starter={starter}
            index={i}
            selected={starter.id === selected}
            onSelect={() => onSelect(starter.id)}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-6">
        <ContinueButton disabled={!selected || pending} onClick={onContinue} />
        <button
          type="button"
          disabled={pending}
          onClick={onExplore}
          className="text-accent dark:text-primary text-[15px] hover:underline"
        >
          Explore more
        </button>
      </div>
    </div>
  )
}
