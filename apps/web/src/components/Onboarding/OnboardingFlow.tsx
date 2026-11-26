"use client"

import { useState, useTransition } from "react"

import { STEPS } from "@/constants/onboarding"
import { finishOnboarding, saveOnboarding } from "@/lib/onboarding/actions"
import { pickStarters } from "@/lib/onboarding/starters"
import type { Starter } from "@/types/onboarding"

import { ChecksStep } from "./ChecksStep"
import { InterestStep } from "./InterestStep"
import { NameStep } from "./NameStep"
import { OnboardingShell } from "./OnboardingShell"
import { StarterStep } from "./StarterStep"
import { StepStage } from "./StepStage"

type OnboardingFlowProps = {
  initial: { name?: string; interests: string[] }
  region: string
  chain: string
  starters: Starter[]
  offeredInterests: { id: string; label: string }[]
}

export function OnboardingFlow({ initial, region, chain, starters, offeredInterests }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [interests, setInterests] = useState(initial.interests)
  const [name, setName] = useState(initial.name ?? "")
  const [chosen, setChosen] = useState<string>()
  const [pending, startTransition] = useTransition()

  const offered = pickStarters(starters, interests)
  const selected = chosen ?? offered[0]?.id
  const next = () => setStep((current) => Math.min(current + 1, STEPS.length - 1))

  const finish = (to?: Parameters<typeof finishOnboarding>[0]) => startTransition(() => finishOnboarding(to))

  return (
    <OnboardingShell
      step={step}
      onBack={() => setStep((current) => Math.max(current - 1, 0))}
      onSkip={() => finish()}
      skipping={pending}
    >
      <StepStage step={step}>
        {(shown) => (
          <>
            {shown === 0 && (
              <InterestStep
                name={initial.name}
                interests={offeredInterests}
                value={interests}
                onChange={setInterests}
                onContinue={() => {
                  startTransition(() => saveOnboarding({ interests }))
                  next()
                }}
              />
            )}
            {shown === 1 && (
              <NameStep
                value={name}
                onChange={setName}
                pending={pending}
                onContinue={() => {
                  startTransition(() => saveOnboarding({ name }))
                  next()
                }}
              />
            )}
            {shown === 2 && <ChecksStep region={region} chain={chain} onContinue={next} />}
            {shown === 3 && (
              <StarterStep
                starters={offered}
                selected={selected}
                onSelect={setChosen}
                pending={pending}
                onContinue={() => finish({ starter: selected })}
                onExplore={() => finish({ stocks: true })}
              />
            )}
          </>
        )}
      </StepStage>
    </OnboardingShell>
  )
}
