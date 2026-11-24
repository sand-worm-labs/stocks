"use client"

import { useEffect, useState } from "react"
import { PiCheckBold, PiCircleNotch } from "react-icons/pi"

import { Card } from "@/components/ui/card"
import { RESEARCH_STEPS } from "@/constants/flow"
import { cn } from "@/lib/utils"

// How long each of the agent's steps takes, while the research is made up
const STEP_MS = 850

type ResearchProgressProps = { running: boolean; onDone: () => void | Promise<void> }

// What the agent does, step by step: a tick for each done, a spinner on the one it is on. When all are done it says so
// and folds down to one line.
export function ResearchProgress({ running, onDone }: ResearchProgressProps) {
  const [done, setDone] = useState(running ? 0 : RESEARCH_STEPS.length)

  useEffect(() => {
    if (!running) return setDone(RESEARCH_STEPS.length)
    if (done >= RESEARCH_STEPS.length) {
      onDone()
      return
    }

    const timer = setTimeout(() => setDone((count) => count + 1), STEP_MS)
    return () => clearTimeout(timer)
  }, [running, done, onDone])

  const finished = done >= RESEARCH_STEPS.length

  return (
    <Card className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">{finished ? "Research done" : "The agent is working"}</h2>
        <span className="text-ink-400 text-sm tabular-nums">
          {Math.min(done, RESEARCH_STEPS.length)} of {RESEARCH_STEPS.length}
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
                  isDone ? "border-mark text-mark" : "dark:border-border-tertiary border-[#D0D5DD]"
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
