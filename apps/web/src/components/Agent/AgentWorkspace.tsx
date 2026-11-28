"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PiArrowDown } from "react-icons/pi"

import { AgentComposer } from "@/components/Flow/AgentComposer"
import { BOTTOM_SLACK_PX } from "@/constants/components/agent/agent-workspace"
import { useAgentConversation } from "@/hooks/use-agent-conversation"
import { useAgentMotion } from "@/hooks/use-agent-motion"
import { type ThreadState, useAgentThread } from "@/hooks/use-agent-thread"
import type { AgentMessage, AgentScript } from "@/types/agent"

import { AgentContext } from "./AgentContext"
import { AgentHeader } from "./AgentHeader"
import { AgentMessageView } from "./AgentMessageView"
import { AgentSuggestions } from "./AgentSuggestions"
import { AgentThinking } from "./AgentThinking"
import { ThreadStatus } from "./ThreadStatus"

type Conversation = {
  messages: AgentMessage[]
  thinking: boolean
  send: (message: string) => void
  decide?: (messageId: string, decision: "confirm" | "cancel") => void
  suggestions?: string[]
  state?: ThreadState
  retry?: () => void
}

// The agent beside a strategy. `strategyId` is for a strategy the person made: the conversation is then the one the API keeps for it, so it
// is the same on every page of the strategy and on every device, and what the agent says comes from the strategy as it stands. Without one
// (a made-up strategy) it is only the page's own script.
export function AgentWorkspace({ script, strategyId }: { script: AgentScript; strategyId?: string }) {
  return strategyId ? <StoredAgent script={script} strategyId={strategyId} /> : <ScriptedAgent script={script} />
}

function ScriptedAgent({ script }: { script: AgentScript }) {
  const { messages, thinking, send } = useAgentConversation(script.messages)
  return <AgentPanel script={script} conversation={{ messages, thinking, send }} isScripted />
}

function StoredAgent({ script, strategyId }: { script: AgentScript; strategyId: string }) {
  const thread = useAgentThread(strategyId)
  return <AgentPanel script={{ ...script, messages: [] }} intro={script.messages} conversation={thread} />
}

type AgentPanelProps = {
  script: AgentScript
  conversation: Conversation
  // What the page says first, before the conversation that is kept: where the strategy is and what to do next
  intro?: AgentMessage[]
  isScripted?: boolean
}

function AgentPanel({ script, conversation, intro = [], isScripted = false }: AgentPanelProps) {
  const { thinking, send, decide, suggestions = [], state = "ready", retry } = conversation
  const stream = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const context = useMemo(() => ({ send, decide }), [send, decide])
  // Nothing is drawn until the kept conversation is in, so it arrives whole and in order instead of piece by piece
  const messages = state === "loading" ? [] : [...intro, ...conversation.messages]
  const firstReply = isScripted ? script.messages.find(({ from }) => from === "agent")?.id : undefined

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

  // What the agent adds to a message that is being written (Sandworm's agent at work) stays in view, unless the person has scrolled up to read
  const { messages: kept } = conversation
  useEffect(() => {
    const element = stream.current
    if (element && atBottom) element.scrollTo({ top: element.scrollHeight })
  }, [kept, atBottom])

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
            aria-busy={state === "loading"}
            className="absolute inset-0 flex flex-col gap-4 overflow-y-auto px-4 py-4"
          >
            <ThreadStatus state={state} onRetry={retry} />
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
        <div className="border-border-secondary dark:border-border-tertiary flex flex-col gap-2.5 border-t p-3">
          {state === "ready" && !thinking && <AgentSuggestions suggestions={suggestions} onPick={send} />}
          <AgentComposer onSend={send} prompts={suggestions} isDisabled={thinking || state === "loading"} />
        </div>
      </aside>
    </AgentContext>
  )
}
