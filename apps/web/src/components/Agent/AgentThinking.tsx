"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { AGENT_VERB_INTERVAL_MS, AGENT_VERBS } from "@/constants/agent"

export function AgentThinking() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % AGENT_VERBS.length), AGENT_VERB_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div role="status" aria-live="polite" className="flex h-6 items-center gap-2">
      <Image src="/img/agent-ring.svg" alt="" width={20} height={20} className="size-5 flex-none animate-spin" />
      <span className="text-ink-400 overflow-hidden text-[13px] font-medium">
        <span key={index} className="animate-fade-up inline-block">
          {AGENT_VERBS[index]}…
        </span>
      </span>
    </div>
  )
}
