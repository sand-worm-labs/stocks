"use client"

import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { PiCircleNotch, PiLockKey } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { Badge } from "@/components/ui/badge"
import { type Tone, TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"

import { ResearchProgress } from "./ResearchProgress"

// Where a model is: its rules waiting to be confirmed, the agent at work, or results ready to read and trade from
type Phase = "rules" | "researching" | "ready"

const STATUS: Record<Phase, { label: string; tone: Tone }> = {
  rules: { label: "Draft", tone: "warning" },
  researching: { label: "Researching", tone: "info" },
  ready: { label: "Results ready", tone: "positive" },
}

type ModelWorkspaceProps = {
  // How far the draft has got, which is where the page opens
  stage?: Phase
  // The agent in the side panel, for each point the page can be at: a text box to change the rules and the rest by
  agents: Record<Phase, ReactNode>
  breadcrumb: ReactNode
  name: string
  // What was asked for, in the owner's words
  brief: string
  rules: ReactNode
  plan: string
  verdict: ReactNode
  report: ReactNode
  // The button that opens the review of buying
  buy: ReactNode
}

// A model on one page that builds itself as it goes: its rules first, then the agent's research as it runs, then the report,
// then the way to buy. There is no step to pick; the page grows, and one button always says what comes next.
export function ModelWorkspace({
  stage,
  agents,
  breadcrumb,
  name,
  brief,
  rules,
  plan,
  verdict,
  report,
  buy,
}: ModelWorkspaceProps) {
  const [phase, setPhase] = useState<Phase>(stage ?? "rules")
  const shown = useRef(false)
  const research = useRef<HTMLDivElement>(null)
  const reportSection = useRef<HTMLDivElement>(null)
  const finish = useCallback(() => setPhase("ready"), [])

  // Bring what has just appeared into view
  useEffect(() => {
    // Not on the first showing: a page that opens part way along starts at its top
    if (!shown.current) return void (shown.current = true)
    const target = phase === "researching" ? research.current : phase === "ready" ? reportSection.current : null
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [phase])

  const { label, tone } = STATUS[phase]

  return (
    <FlowLayout aside={<Fragment key={phase}>{agents[phase]}</Fragment>}>
      <div className="flex flex-col gap-6">
        {breadcrumb}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-2">
            <Badge className="w-fit gap-2 px-3 py-1">
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASSNAME[tone])} />
              {label}
            </Badge>
            <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{name}</h1>
            <p className="text-ink-400 text-sm">&ldquo;{brief}&rdquo;</p>
          </div>

          {phase === "rules" && (
            <button
              type="button"
              onClick={() => setPhase("researching")}
              className={cn(buttonVariants({ intent: "dark", size: "compact" }), "h-11 px-5")}
            >
              Confirm rules
            </button>
          )}
          {phase === "researching" && (
            <button
              type="button"
              disabled
              className={cn(buttonVariants({ intent: "dark", size: "compact" }), "h-11 px-5 opacity-70")}
            >
              <PiCircleNotch aria-hidden="true" className="animate-spin" />
              Researching…
            </button>
          )}
          {phase === "ready" && buy}
        </header>

        <section aria-label="Rules" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">Rules</h2>
            <span className="text-ink-400 flex items-center gap-1.5 text-sm">
              {phase === "rules" ? (
                "Read them, then confirm. Once confirmed they are locked."
              ) : (
                <>
                  <PiLockKey aria-hidden="true" /> Locked
                </>
              )}
            </span>
          </div>
          {rules}
        </section>

        {phase !== "rules" && (
          <div ref={research} className="animate-fade-up scroll-mt-[calc(var(--shell-top)+1rem)]">
            <ResearchProgress running={phase === "researching"} onDone={finish} />
          </div>
        )}

        {phase === "ready" && (
          <div
            ref={reportSection}
            className="animate-fade-up flex scroll-mt-[calc(var(--shell-top)+1rem)] flex-col gap-4"
          >
            <div className="border-border-secondary bg-block-surface/95 dark:border-border-tertiary sticky top-[calc(var(--shell-top)+0.5rem)] z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[15px] leading-[22px] font-medium">{plan}</p>
                <span>{verdict}</span>
              </div>
              <div className="flex flex-none gap-2">{buy}</div>
            </div>
            {report}
          </div>
        )}
      </div>
    </FlowLayout>
  )
}
