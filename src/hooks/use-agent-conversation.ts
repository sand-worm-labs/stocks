"use client"

import { useCallback, useRef, useState } from "react"

import { replyTo } from "@/lib/agent/reply"
import type { AgentMessage } from "@/lib/agent/types"

const REPLY_DELAY_MS = 500

// The messages on show: the ones a screen opens with, then what is said and answered. Where the agent's answers come
// from is the one place to change when it is connected.
export function useAgentConversation(initial: AgentMessage[]) {
  const [messages, setMessages] = useState(initial)
  const count = useRef(0)

  const send = useCallback((text: string) => {
    const id = ++count.current
    setMessages((current) => [...current, { id: `you-${id}`, from: "user", blocks: [{ type: "text", text }] }])
    setTimeout(() => setMessages((current) => [...current, replyTo(text, `agent-${id}`)]), REPLY_DELAY_MS)
  }, [])

  return { messages, send }
}
