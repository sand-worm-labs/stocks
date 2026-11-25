"use client"

import { useCallback, useRef, useState } from "react"

import { REPLY_DELAY_MS } from "@/constants/hooks/use-agent-conversation"
import { replyTo } from "@/lib/agent/reply"
import type { AgentMessage } from "@/types/agent"

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
