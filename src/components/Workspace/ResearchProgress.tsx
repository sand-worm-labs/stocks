"use client"

import { useEffect, useRef, useState } from "react"
import { PiCheckBold, PiCircleNotch } from "react-icons/pi"

import { Card } from "@/components/ui/card"
import { STEP_MS, TICK_MS } from "@/constants/components/workspace/research-progress"
import { RESEARCH_STEPS } from "@/constants/flow"
import { useNow } from "@/hooks/use-now"
import { cn } from "@/lib/utils"

type ResearchProgressProps = {
  running: boolean
  // When the run began and when it is due to end, as the server has them. With these, leaving and coming back shows where it really is
  // rather than starting over.
  startedAt?: string
  readyAt?: string
  onDone: () => void | Promise<void>
}

const timeLeft = (ms: number) =>
  ms < 60_000 ? "less than a minute left" : `about ${Math.ceil(ms / 60_000)} minutes left`

export function ResearchProgress({ running, startedAt, readyAt, onDone }: ResearchProgressProps) {
  const [{ start, end }] = useState(() =>
    startedAt && readyAt
      ? { start: Date.parse(startedAt), end: Date.parse(readyAt) }
      : { start: Date.now(), end: Date.now() + RESEARCH_STEPS.length * STEP_MS }
  )

  const now = useNow(TICK_MS, running)
  const called = useRef(false)
  const progress = !running ? 1 : now === undefined ? 0 : Math.min(Math.max((now - start) / (end - start), 0), 1)
  const done = Math.min(Math.floor(progress * RESEARCH_STEPS.length), RESEARCH_STEPS.length)

  useEffect(() => {
    if (!running || progress < 1 || called.current) return
    called.current = true
    void onDone()
  }, [running, progress, onDone])

  const finished = done >= RESEARCH_STEPS.length

  return (
    <Card className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">{finished ? "Research done" : "The agent is working"}</h2>
        <span className="text-ink-400 text-sm tabular-nums">
          {done} of {RESEARCH_STEPS.length}
          {!finished && now !== undefined && ` · ${timeLeft(end - now)}`}
        </span>
      </div>
      <div className="bg-inputBg h-1.5 overflow-hidden rounded-full dark:bg-white/10">
        <div
          style={{ width: `${(done / RESEARCH_STEPS.length) * 100}%` }}
          className="from-mark h-full rounded-full bg-gradient-to-r to-emerald-500 transition-[width] duration-500 ease-out"
        />
      </div>
      <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {RESEARCH_STEPS.map((step, i) => {
          const isDone = i < done
          const isNow = i === done

          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-colors",
                isDone ? "text-ink-100" : isNow ? "text-ink-100 font-medium" : "text-ink-300"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 flex-none items-center justify-center rounded-full border",
                  isDone ? "border-mark text-mark" : "border-control"
                )}
              >
                {isDone ? (
                  <PiCheckBold size={11} />
                ) : isNow ? (
                  <PiCircleNotch size={12} className="animate-spin" />
                ) : null}
              </span>
              {step}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
