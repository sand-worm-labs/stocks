"use client"

import { useEffect, useRef, useState } from "react"
import { PiCheckBold, PiCircleNotch, PiWarningCircle } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { errorMessage, finishResearch, retryResearch } from "@/lib/strategies/client"
import type { AgentStep } from "@/types/agent"

const POLL_MS = 4000

type ResearchWaitingProps = {
  id: string
  running: boolean
  // What went wrong, if the run has already failed when the page opens
  failure?: string
  // Where the run has got to when the page opens; it is read again each time the server is asked
  progress?: AgentStep[]
  onDone: () => void | Promise<void>
}

// Research done by Sandworm (or an agent on it) has no clock to follow: it ends when it reports back. So the server is asked now and then,
// and the page moves on the moment the answer is that the strategy is ready.
export function ResearchWaiting({ id, running, failure, progress, onDone }: ResearchWaitingProps) {
  const [error, setError] = useState(failure)
  const [steps, setSteps] = useState(progress ?? [])
  const called = useRef(false)
  const [retrying, setRetrying] = useState(false)

  // Starts the run again from the beginning, and goes back to watching it
  const retry = async () => {
    setRetrying(true)
    try {
      await retryResearch(id)
      setError(undefined)
      setSteps([])
    } catch (problem) {
      setError(errorMessage(problem))
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    if (!running || error) return
    const timer = setInterval(async () => {
      try {
        const answer = await finishResearch(id)
        if (answer.progress) setSteps(answer.progress)
        if (answer.error) return setError(answer.error)
        if (answer.stage !== "ready" || called.current) return
        called.current = true
        await onDone()
      } catch (problem) {
        setError(errorMessage(problem))
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [id, running, error, onDone])

  return (
    <Card className="flex items-start gap-3 p-5 md:p-6">
      {error ? (
        <PiWarningCircle size={20} className="text-ink-400 mt-0.5 flex-none" />
      ) : (
        <PiCircleNotch size={20} className="text-ink-400 mt-0.5 flex-none animate-spin" />
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{error ? "The research stopped" : "Sandworm is researching"}</h2>
        <p className="text-ink-400 text-sm">
          {error ?? "It is testing this strategy on real prices, in a notebook in your Sandworm account. The results appear here when they are ready."}
        </p>
        {error && (
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className={buttonVariants({ intent: "outline", size: "compact", className: "mt-2 self-start" })}
          >
            {retrying ? "Starting…" : "Try again"}
          </button>
        )}
        {steps.length > 0 && (
          <ol className="mt-2 flex flex-col gap-1.5">
            {steps.map(({ label, state, url }) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="flex size-4 flex-none items-center justify-center">
                  {state === "done" && <PiCheckBold size={12} />}
                  {state === "running" && !error && <PiCircleNotch size={12} className="animate-spin" />}
                </span>
                <span className={state === "waiting" ? "text-ink-400" : undefined}>{label}</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-ink-100 text-xs">
                    notebook ↗
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}
