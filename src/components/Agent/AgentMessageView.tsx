import { PiSparkle } from "react-icons/pi"

import type { AgentMessage } from "@/lib/agent/types"

import { BlockView } from "./blocks/registry"

function Thinking() {
  return (
    <div data-thinking className="flex h-6 items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span key={dot} data-dot className="bg-ink-300 size-1.5 rounded-full" />
      ))}
    </div>
  )
}

export function AgentMessageView({ message: { id, from, blocks } }: { message: AgentMessage }) {
  if (from === "user") {
    return (
      <div data-message data-id={id} data-from="user" className="flex justify-end pl-8">
        {blocks.map((block, i) =>
          block.type === "text" ? (
            <p key={i} className="bg-inputBg rounded-2xl rounded-br-md px-4 py-3 text-sm leading-6 dark:bg-white/5">
              {block.text}
            </p>
          ) : null
        )}
      </div>
    )
  }

  return (
    <div data-message data-id={id} data-from="agent" className="flex gap-3">
      <span
        aria-hidden="true"
        className="bg-primary/10 text-primary border-primary/30 mt-0.5 flex size-7 flex-none items-center justify-center rounded-lg border"
      >
        <PiSparkle size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Thinking />
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>
    </div>
  )
}
