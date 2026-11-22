"use client"

import { useEffect, useRef, useState } from "react"

const RESET_AFTER_MS = 2000

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), RESET_AFTER_MS)
  }

  return { copied, copy }
}
