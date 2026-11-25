"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PiArrowDown } from "react-icons/pi"

import { AgentComposer } from "@/components/Flow/AgentComposer"
import { BOTTOM_SLACK_PX } from "@/constants/components/agent/agent-workspace"
import { useAgentConversation } from "@/hooks/use-agent-conversation"
import { useAgentMotion } from "@/hooks/use-agent-motion"
import type { AgentScript } from "@/types/agent"

import { AgentContext } from "./AgentContext"
import { AgentHeader } from "./AgentHeader"
import { AgentMessageView } from "./AgentMessageView"
import { AgentThinking } from "./AgentThinking"

export function AgentWorkspace({ script }: { script: AgentScript }) {
  const { messages, thinking, send } = useAgentConversation(script.messages)
  const stream = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const context = useMemo(() => ({ send }), [send])
  const firstReply = script.messages.find(({ from }) => from === "agent")?.id

  useAgentMotion(stream, messages.length)

  const scrollToBottom = useCallback(() => {
    stream.current?.scrollTo({ top: stream.current.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const element = stream.current
    if (!element) return
    const onScroll = () =>
      setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_SLACK_PX)
    element.addEventListener("scroll", onScroll, { passive: true })
    return () => element.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (thinking) scrollToBottom()
  }, [thinking, scrollToBottom])

  return (
    <AgentContext value={context}>
      <aside
        aria-label="Agent"
        className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-full flex-col border-t lg:border-t-0 lg:border-l"
      >
        <AgentHeader activityHref={script.activityHref} />
        <div className="relative min-h-0 flex-1">
          <div
            ref={stream}
            aria-live="polite"
            className="absolute inset-0 flex flex-col gap-4 overflow-y-auto px-4 py-4"
          >
            {messages.map((message) => (
              <AgentMessageView key={message.id} message={message} thinking={message.id === firstReply} />
            ))}
            {thinking && (
              <div className="animate-fade-up">
                <AgentThinking />
              </div>
            )}
          </div>
          {!atBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="animate-fade-up bg-block-surface border-border text-ink-400 hover:bg-hover-bg dark:border-border-tertiary absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm transition-colors"
            >
              <PiArrowDown size={12} aria-hidden="true" />
              Scroll to latest
            </button>
          )}
        </div>
        <div className="border-border-secondary dark:border-border-tertiary border-t p-3">
          <AgentComposer onSend={send} />
        </div>
      </aside>
    </AgentContext>
  )
}
