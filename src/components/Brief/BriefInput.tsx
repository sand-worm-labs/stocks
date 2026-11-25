"use client"

import { PiCircleNotch, PiPaperPlaneTilt } from "react-icons/pi"

import { PromptBox } from "@/components/PromptBox/PromptBox"
import { TradingModeSelect } from "@/components/PromptBox/TradingModeSelect"
import { SEND_CLASSNAME } from "@/constants/components/brief/brief-input"
import { BRIEF_PROMPTS } from "@/constants/flow"
import { cn } from "@/lib/utils"

import { useStartStrategy } from "./useStartStrategy"

type BriefInputProps = {
  value: string
  onChange: (value: string) => void
  canContinue: boolean
  actionLabel: string
}

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
