"use client"

import { useState, useTransition } from "react"

import { STEPS } from "@/constants/onboarding"
import { finishOnboarding, saveOnboarding } from "@/lib/onboarding/actions"
import { pickStarters } from "@/lib/onboarding/starters"
import type { Starter } from "@/lib/onboarding/types"

import { ChecksStep } from "./ChecksStep"
import { InterestStep } from "./InterestStep"
import { NameStep } from "./NameStep"
import { OnboardingShell } from "./OnboardingShell"
import { StarterStep } from "./StarterStep"

type OnboardingFlowProps = {
  initial: { name?: string; interests: string[] }
  region: string
  chain: string
  starters: Starter[]
}

// The first run, one question at a time: what they want to invest in, what to call them, whether they can trade, and a
// brief to start from. Each answer is kept as it is given, so a reload carries on from where it was. Skipping, like
// finishing, ends it for good.
export function OnboardingFlow({ initial, region, chain, starters }: OnboardingFlowProps) {
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
      {step === 0 && (
        <InterestStep
          name={initial.name}
          value={interests}
          onChange={setInterests}
          onContinue={() => {
            startTransition(() => saveOnboarding({ interests }))
            next()
          }}
        />
      )}
      {step === 1 && (
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
      {step === 2 && <ChecksStep region={region} chain={chain} onContinue={next} />}
      {step === 3 && (
        <StarterStep
          starters={offered}
          selected={selected}
          onSelect={setChosen}
          pending={pending}
          onContinue={() => finish({ starter: selected })}
          onExplore={() => finish({ stocks: true })}
        />
      )}
    </OnboardingShell>
  )
}
