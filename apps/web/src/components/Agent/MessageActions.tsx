"use client"

import { useState } from "react"
import { PiCheck, PiCopy, PiThumbsDown, PiThumbsUp } from "react-icons/pi"

import { Tooltip } from "@/components/Tooltip/Tooltip"
import { BUTTON } from "@/constants/components/agent/message-actions"
import { cn } from "@/lib/utils"

type Rating = "up" | "down" | null

export function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState<Rating>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Copying needs a secure page; without one there is nothing to show
    }
  }

  const rate = (value: "up" | "down") => setRating((current) => (current === value ? null : value))

  return (
    <div data-block className="-mt-1 flex items-center gap-0.5">
      <Tooltip title={copied ? "Copied" : "Copy"} side="top">
        <button type="button" aria-label="Copy message" onClick={copy} className={BUTTON}>
          {copied ? <PiCheck size={13} /> : <PiCopy size={13} />}
        </button>
      </Tooltip>
      {(["up", "down"] as const).map((value) => {
        const Icon = value === "up" ? PiThumbsUp : PiThumbsDown
        return (
          <Tooltip key={value} title={value === "up" ? "Helpful" : "Not helpful"} side="top">
            <button
              type="button"
              aria-label={value === "up" ? "Helpful" : "Not helpful"}
              aria-pressed={rating === value}
              onClick={() => rate(value)}
              className={cn(BUTTON, rating === value && "text-primary bg-primary/10 hover:text-primary")}
            >
              <Icon size={13} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
