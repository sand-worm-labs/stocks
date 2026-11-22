"use client"

import { useCallback, useRef, useState } from "react"

import { replyTo } from "@/lib/agent/reply"
import type { AgentMessage } from "@/lib/agent/types"

// How long the agent is shown at work before its answer. Real replies take as long as they take.
const REPLY_DELAY_MS = 1600

// The messages on show: the ones a screen opens with, then what is said and answered. Where the agent's answers come
// from is the one place to change when it is connected.
export function useAgentConversation(initial: AgentMessage[]) {
  const [messages, setMessages] = useState(initial)
  const [thinking, setThinking] = useState(false)
  const count = useRef(0)

  const send = useCallback((text: string) => {
    const id = ++count.current
    setMessages((current) => [...current, { id: `you-${id}`, from: "user", blocks: [{ type: "text", text }] }])
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      setMessages((current) => [...current, replyTo(text, `agent-${id}`)])
    }, REPLY_DELAY_MS)
  }, [])

  return { messages, thinking, send }
}
