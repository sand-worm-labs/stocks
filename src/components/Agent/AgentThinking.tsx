"use client"

import { useEffect, useState } from "react"

import { AGENT_VERB_INTERVAL_MS, AGENT_VERBS } from "@/constants/agent"

// A ring that turns and the agent saying what it is at, changing as it goes on. It starts on the same words every time, so
// the server and the browser agree on what to draw.
export function AgentThinking() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % AGENT_VERBS.length), AGENT_VERB_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div role="status" aria-live="polite" className="flex h-6 items-center gap-2">
      <svg className="size-5 flex-none animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM2.08708 8C2.08708 11.2656 4.73438 13.9129 8 13.9129C11.2656 13.9129 13.9129 11.2656 13.9129 8C13.9129 4.73438 11.2656 2.08708 8 2.08708C4.73438 2.08708 2.08708 4.73438 2.08708 8Z"
          fill="url(#agent-thinking-ring)"
        />
        <defs>
          <radialGradient
            id="agent-thinking-ring"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(8.75 7.5) rotate(135) scale(9.54594 9.7989)"
          >
            <stop stopColor="var(--mark)" />
            <stop offset="0.658654" stopColor="#7BFF42" />
            <stop offset="0.658754" stopColor="#B8B3FA" />
            <stop offset="0.745192" stopColor="#2DB2FF" />
            <stop offset="0.826923" stopColor="#FF0000" />
            <stop offset="0.908654" stopColor="#DED757" />
            <stop offset="1" stopColor="var(--mark)" />
          </radialGradient>
        </defs>
      </svg>
      <span className="text-ink-400 overflow-hidden text-[13px] font-medium">
        <span key={index} className="animate-fade-up inline-block">
          {AGENT_VERBS[index]}…
        </span>
      </span>
    </div>
  )
}
