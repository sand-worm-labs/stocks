"use client"

import { useEffect, useState } from "react"

const TYPING_SPEED_MS = 35
const DELETING_SPEED_MS = 20
const HOLD_MS = 1400
const PAUSE_BEFORE_NEXT_MS = 400

// Types each prompt out in full, holds it, deletes it, then moves to the next. Stops and clears while `active` is false.
export function useTypewriterPlaceholder(prompts: readonly string[], active: boolean) {
  const [promptIndex, setPromptIndex] = useState(0)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const fullText = prompts[promptIndex] ?? ""

  useEffect(() => {
    if (!active) {
      setText("")
      setPromptIndex(0)
      setIsDeleting(false)
      return
    }

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
