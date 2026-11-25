"use client"

import { useState } from "react"
import { PiPaperPlaneTilt } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { PromptBox } from "@/components/PromptBox/PromptBox"
import { TradingModeSelect } from "@/components/PromptBox/TradingModeSelect"
import { AGENT_PROMPTS } from "@/constants/flow"
import { cn } from "@/lib/utils"

type AgentComposerProps = {
  onSend?: (message: string) => void
  className?: string
}

export function AgentComposer({ onSend, className }: AgentComposerProps) {
  const [message, setMessage] = useState("")
  const canSend = message.trim().length > 0

  function send() {
    if (!canSend) return
    onSend?.(message.trim())
    setMessage("")
  }

  return (
    <PromptBox
      id="agent-message"
      label="Message"
      value={message}
      onChange={setMessage}
      onSubmit={send}
      prompts={AGENT_PROMPTS}
      className={className}
      controls={
        <>
          <TradingModeSelect />
          <button
            type="button"
            aria-label="Send"
            disabled={!canSend}
            onClick={send}
            className={cn(
              buttonVariants({ intent: "create", size: "compact" }),
              "min-h-0 rounded-full p-2.5",
              !canSend && "bg-disabled dark:bg-disabled cursor-not-allowed border-transparent dark:text-white"
            )}
          >
            <PiPaperPlaneTilt size={18} />
          </button>
        </>
      }
    />
  )
}
