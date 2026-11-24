"use client"

import { useRouter } from "next/navigation"
import { PiPaperPlaneTilt } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { PromptBox } from "@/components/PromptBox/PromptBox"
import { TradingModeSelect } from "@/components/PromptBox/TradingModeSelect"
import { routeHref } from "@/config/routes"
import { BRIEF_PROMPTS } from "@/constants/flow"
import { cn } from "@/lib/utils"

// The same round send button as the chat
const SEND_CLASSNAME = buttonVariants({ intent: "create", size: "compact", className: "min-h-0 rounded-full p-2.5" })

type BriefInputProps = {
  value: string
  onChange: (value: string) => void
  // Whether the brief can go on to its rules: written, and something that can be done
  canContinue: boolean
  // The portfolio the brief becomes, whose rules come next
  portfolioId: string
  actionLabel: string
}

// Where the brief is written. Continuing sits in the box itself, beside the trading mode.
export function BriefInput({ value, onChange, canContinue, portfolioId, actionLabel }: BriefInputProps) {
  const router = useRouter()
  const next = routeHref("rules", undefined, portfolioId) ?? "/portfolios"

  return (
    <PromptBox
      id="brief"
      label="Your idea"
      value={value}
      onChange={onChange}
      onSubmit={() => canContinue && router.push(next)}
      prompts={BRIEF_PROMPTS}
      controls={
        <>
          <TradingModeSelect />
          {canContinue ? (
            <AppLink route="rules" slug={portfolioId} className={SEND_CLASSNAME}>
              <PiPaperPlaneTilt size={18} aria-label={actionLabel} />
            </AppLink>
          ) : (
            <button
              type="button"
              disabled
              aria-label={actionLabel}
              className={cn(
                SEND_CLASSNAME,
                "bg-disabled dark:bg-disabled cursor-not-allowed border-transparent dark:text-white"
              )}
            >
              <PiPaperPlaneTilt size={18} />
            </button>
          )}
        </>
      }
    />
  )
}
