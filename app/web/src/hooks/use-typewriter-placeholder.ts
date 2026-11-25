"use client"

import { useEffect, useState } from "react"
import {
  DELETING_SPEED_MS,
  HOLD_MS,
  PAUSE_BEFORE_NEXT_MS,
  TYPING_SPEED_MS,
} from "@/constants/hooks/use-typewriter-placeholder"

export function useTypewriterPlaceholder(prompts: readonly string[], active: boolean) {
  const [promptIndex, setPromptIndex] = useState(0)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [wasActive, setWasActive] = useState(active)
  const fullText = prompts[promptIndex] ?? ""

  // Going quiet clears what was typed, so it starts again from the first prompt. Done while drawing, rather than in an effect, so
  // nothing is shown that is about to be cleared.
  if (active !== wasActive) {
    setWasActive(active)
    if (!active) {
      setText("")
      setPromptIndex(0)
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (!active) return

    const timeout = setTimeout(
      () => {
        if (!isDeleting && text.length < fullText.length) return setText(fullText.slice(0, text.length + 1))
        if (!isDeleting) return setIsDeleting(true)
        if (text.length > 0) return setText(text.slice(0, -1))
        setPromptIndex((i) => (i + 1) % prompts.length)
        setIsDeleting(false)
      },
      !isDeleting
        ? text.length < fullText.length
          ? TYPING_SPEED_MS
          : HOLD_MS
        : text.length > 0
          ? DELETING_SPEED_MS
          : PAUSE_BEFORE_NEXT_MS
    )

    return () => clearTimeout(timeout)
  }, [active, text, fullText, isDeleting, prompts.length])

  return text
}
