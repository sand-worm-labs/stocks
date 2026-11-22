import type { AgentMessage } from "@/lib/agent/types"

import { AgentThinking } from "./AgentThinking"
import { BlockView } from "./blocks/registry"
import { MessageActions } from "./MessageActions"

type AgentMessageViewProps = {
  message: AgentMessage
  // Whether the agent is shown at work for a moment before it answers
  thinking?: boolean
}

export function AgentMessageView({ message: { id, from, blocks }, thinking }: AgentMessageViewProps) {
  if (from === "user") {
    return (
      <div data-message data-id={id} data-from="user" className="flex justify-end pl-10">
        {blocks.map((block, i) =>
          block.type === "text" ? (
            <p
              key={i}
              className="bg-hover-bg border-hover-border dark:border-border-tertiary w-fit max-w-full rounded-2xl rounded-br-sm border px-4 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap dark:bg-white/5"
            >
              {block.text}
            </p>
          ) : null
        )}
      </div>
    )
  }

  const said = blocks.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n\n")

  return (
    <div data-message data-id={id} data-from="agent" className="flex flex-col gap-3">
      {thinking && (
        <div data-thinking>
          <AgentThinking />
        </div>
      )}
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
      {said && <MessageActions text={said} />}
    </div>
  )
}
