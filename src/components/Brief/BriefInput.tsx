"use client"

import { PiCircleNotch, PiPaperPlaneTilt } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { PromptBox } from "@/components/PromptBox/PromptBox"
import { TradingModeSelect } from "@/components/PromptBox/TradingModeSelect"
import { BRIEF_PROMPTS } from "@/constants/flow"
import { cn } from "@/lib/utils"

import { useStartStrategy } from "./useStartStrategy"

// The same round send button as the chat
const SEND_CLASSNAME = buttonVariants({ intent: "create", size: "compact", className: "min-h-0 rounded-full p-2.5" })

type BriefInputProps = {
  value: string
  onChange: (value: string) => void
  // Whether the brief can go on to its rules: written, and something that can be done
  canContinue: boolean
  actionLabel: string
}

// Where the brief is written. Sending sits in the box itself, beside the trading mode, and makes the strategy from what is written.
export function BriefInput({ value, onChange, canContinue, actionLabel }: BriefInputProps) {
  const { start, busy } = useStartStrategy()

  return (
    <div data-tour="idea-box">
      <PromptBox
        id="brief"
        label="Your idea"
        value={value}
        onChange={onChange}
        onSubmit={() => canContinue && start(value)}
        prompts={BRIEF_PROMPTS}
        controls={
          <>
            <TradingModeSelect />
            <button
              type="button"
              disabled={!canContinue || busy}
              aria-label={actionLabel}
              aria-busy={busy}
              onClick={() => start(value)}
              className={cn(
                SEND_CLASSNAME,
                (!canContinue || busy) && "cursor-not-allowed",
                !canContinue && "bg-disabled dark:bg-disabled border-transparent dark:text-white"
              )}
            >
              {busy ? <PiCircleNotch size={18} className="animate-spin" /> : <PiPaperPlaneTilt size={18} />}
            </button>
          </>
        }
      />
    </div>
  )
}
