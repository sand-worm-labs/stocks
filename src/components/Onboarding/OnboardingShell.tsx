"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { PiCaretLeft } from "react-icons/pi"

import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { STEPS } from "@/constants/onboarding"
import { cn } from "@/lib/utils"

import { SignOutLink } from "./SignOutLink"

type OnboardingShellProps = {
  step: number
  onBack: () => void
  onSkip: () => void
  skipping: boolean
  children: ReactNode
}

// The frame of every step: the name at the top with a way back and a way out, the step in the middle, and at the bottom
// where it is in the four and the way to skip the rest. No card, no chrome: one question at a time.
export function OnboardingShell({ step, onBack, onSkip, skipping, children }: OnboardingShellProps) {
  const router = useRouter()

  return (
    <div className="bg-page-surface font-body flex min-h-dvh flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-5 md:px-8">
        <div>
          {step > 0 && (
            <button
              type="button"
              aria-label="Back"
              onClick={onBack}
              className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg flex size-10 items-center justify-center rounded-full transition-colors"
            >
              <PiCaretLeft size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
          aria-label="Sandworm Stocks"
        >
          <SandwormLogo size={26} />
          <span className="font-tertiary text-base font-medium uppercase">Sandworm</span>
          <span className="border-beta-badge-border bg-beta-badge-bg text-beta-badge-text font-tertiary rounded-lg border px-2 py-0.5 text-[0.6rem] lg:text-xs">
            stocks
          </span>
        </button>
        <div className="flex justify-end">
          <SignOutLink />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">{children}</main>

      <footer className="flex items-center justify-center gap-6 px-4 pt-2 pb-9">
        <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((name, i) => (
            <li
              key={name}
              aria-hidden="true"
              className={cn(
                "h-[3px] w-7 rounded-full transition-colors duration-300",
                i <= step ? "bg-ink-100" : "bg-border-secondary dark:bg-border-tertiary"
              )}
            />
          ))}
        </ol>
        <button
          type="button"
          onClick={onSkip}
          disabled={skipping}
          className="text-ink-400 hover:text-ink-100 text-[15px] transition-colors disabled:opacity-60"
        >
          Skip
        </button>
      </footer>
    </div>
  )
}
