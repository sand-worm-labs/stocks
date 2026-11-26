"use client"

import { useEffect, useRef, useState } from "react"
import { PiCheckBold, PiCheckCircle, PiCircleNotch, PiRobot, PiWarningCircle } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { errorMessage, finishResearch, retryResearch } from "@/lib/strategies/client"
import type { AgentStep } from "@/types/agent"

const POLL_MS = 4000

type ResearchWaitingProps = {
  id: string
  running: boolean
  // Who is doing the research, so the card says what is really being waited for. Sandworm unless it is an agent from outside.
  runner?: "sandworm" | "agent"
  // What went wrong, if the run has already failed when the page opens
  failure?: string
  // Where the run has got to when the page opens; it is read again each time the server is asked
  progress?: AgentStep[]
  onDone: () => void | Promise<void>
}

// What the card says, for who is doing the research and where it has got to. It never says "Sandworm is researching" of research that an
// agent is to do, or that has finished.
function words({ runner, error, isFinished }: { runner: "sandworm" | "agent"; error?: string; isFinished: boolean }) {
  if (error) return { title: "The research stopped", text: error }
  if (isFinished) return { title: "Research finished", text: "The results are below. Open a notebook to read every number." }
  if (runner === "agent") {
    return {
      title: "Waiting for your agent",
      text: "An agent, such as Claude, does this research through the Stocks MCP and hands it back here. Ask it: “Do the research for my waiting strategies”. Nothing runs in Sandworm until it does.",
    }
  }
  return { title: "Sandworm is researching", text: "It is testing this strategy on real prices, in a notebook in your Sandworm account. The results appear here when they are ready." }
}

// Research done by Sandworm (or an agent on it) has no clock to follow: it ends when it reports back. So the server is asked now and then,
// and the page moves on the moment the answer is that the strategy is ready.
export function ResearchWaiting({ id, running, runner = "sandworm", failure, progress, onDone }: ResearchWaitingProps) {
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

  const isFinished = !running && !error
  const { title, text } = words({ runner, error, isFinished })

  return (
    <Card className="flex items-start gap-3 p-5 md:p-6">
      {error ? (
        <PiWarningCircle size={20} className="text-ink-400 mt-0.5 flex-none" />
      ) : isFinished ? (
        <PiCheckCircle size={20} className="mt-0.5 flex-none text-emerald-700 dark:text-emerald-400" />
      ) : runner === "agent" ? (
        <PiRobot size={20} className="text-ink-400 mt-0.5 flex-none" />
      ) : (
        <PiCircleNotch size={20} className="text-ink-400 mt-0.5 flex-none animate-spin" />
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-ink-400 text-sm">{text}</p>
        {error && runner === "sandworm" && (
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
