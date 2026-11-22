"use client"

import { useMemo, useRef } from "react"

import { AgentComposer } from "@/components/Flow/AgentComposer"
import { useAgentConversation } from "@/hooks/use-agent-conversation"
import { useAgentMotion } from "@/hooks/use-agent-motion"
import type { AgentScript } from "@/lib/agent/types"

import { AgentContext } from "./AgentContext"
import { AgentHeader } from "./AgentHeader"
import { AgentMessageView } from "./AgentMessageView"

// The agent beside a flow screen, as a panel and not a card. It fills the height it is given: a title, a conversation that
// scrolls, and a box to answer in that stays put. What the agent says and shows comes from the script; how it comes in is its motion.
export function AgentWorkspace({ script }: { script: AgentScript }) {
  const { messages, send } = useAgentConversation(script.messages)
  const stream = useRef<HTMLDivElement>(null)
  const context = useMemo(() => ({ send }), [send])

  useAgentMotion(stream, messages.length)

  return (
    <AgentContext value={context}>
      <aside
        aria-label="Agent"
        className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-full flex-col border-t lg:border-t-0 lg:border-l"
      >
        <AgentHeader />
        <div ref={stream} aria-live="polite" className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <AgentMessageView key={message.id} message={message} />
          ))}
        </div>
        <div className="border-border-secondary dark:border-border-tertiary border-t p-3">
          <AgentComposer onSend={send} />
        </div>
      </aside>
    </AgentContext>
  )
}
