"use client"

import { useRouter } from "next/navigation"
import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { PiCircleNotch, PiLockKey } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { FlowLayout } from "@/components/Flow/FlowLayout"
import { StepProgress } from "@/components/Flow/StepProgress"
import { Badge } from "@/components/ui/badge"

import { STATUS, STEP } from "@/constants/components/workspace/model-workspace"
import { RESEARCH_EVENT } from "@/constants/research"
import { TONE_DOT_CLASSNAME } from "@/constants/tone"
import { useIdeaCoverage } from "@/hooks/use-idea-coverage"
import { confirmRules, errorMessage, finishResearch } from "@/lib/strategies/client"
import { cn } from "@/lib/utils"

import type { AgentStep } from "@/types/agent"
import type { WorkspacePhase } from "@/types/ui"
import { CoverageNotice, CoverageStrip } from "./CoverageNotice"
import { DraftFlowProvider } from "./DraftFlow"
import { EditableName } from "./EditableName"
import { LeaveNotice } from "./LeaveNotice"
import { ResearchProgress } from "./ResearchProgress"
import { ResearchWaiting } from "./ResearchWaiting"

type ModelWorkspaceProps = {
  id: string
  research?: { startedAt: string; readyAt?: string; mode?: "timed" | "waiting"; runner?: "sandworm" | "agent"; error?: string; progress?: AgentStep[] }
  real: boolean
  stage?: WorkspacePhase
  agents: Record<WorkspacePhase, ReactNode>
  breadcrumb: ReactNode
  name: string
  brief: string
  rules: ReactNode
  plan: string
  verdict: ReactNode
  report: ReactNode
  buy: ReactNode
}

export function ModelWorkspace({
  id,
  real,
  research: run,
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
  const router = useRouter()
  const coverage = useIdeaCoverage(id, real)
  const [phase, setPhase] = useState<WorkspacePhase>(stage ?? "rules")
  const [confirming, setConfirming] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const shown = useRef(false)
  const research = useRef<HTMLDivElement>(null)
  const reportSection = useRef<HTMLDivElement>(null)

  // The research is done: kept, then shown. If it can't be kept the page stays as it is, and a reload picks the research up again.
  const finish = useCallback(async () => {
    if (real) {
      try {
        const { stage: now } = await finishResearch(id)
        // A real run can't be skipped: it is done when it has reported back
        if (now !== "ready") return void toast.message("The research isn't done yet")
        // So the report shown is the one the agent just made, even when this comes straight after confirming
        router.refresh()
      } catch (error) {
        return void toast.error("Couldn't finish the research", { description: errorMessage(error) })
      }
    }
    setPhase("ready")
  }, [id, real, router])

  // The rules are locked and the agent starts. The page is asked for again so it has what the agent made by the time it is shown.
  const confirm = async () => {
    if (phase !== "rules" || confirming) return
    setConfirming(true)
    try {
      if (real) {
        await confirmRules(id)
        router.refresh()
        // So the page that watches for finished research starts looking now
        window.dispatchEvent(new Event(RESEARCH_EVENT))
      }
      setPhase("researching")
    } catch (error) {
      toast.error("Couldn't confirm the rules", { description: errorMessage(error) })
    } finally {
      setConfirming(false)
    }
  }

  const skip = async () => {
    if (phase !== "researching" || skipping) return
    setSkipping(true)
    try {
      await finish()
    } finally {
      setSkipping(false)
    }
  }

  useEffect(() => {
    // Not on the first showing: a page that opens part way along starts at its top
    if (!shown.current) return void (shown.current = true)
    const target = phase === "researching" ? research.current : phase === "ready" ? reportSection.current : null
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [phase])

  const { label, tone } = STATUS[phase]

  return (
    <DraftFlowProvider value={{ confirm, skip, busy: confirming || skipping }}>
      <FlowLayout
        steps={<StepProgress current={STEP[phase]} />}
        aside={<Fragment key={phase}>{agents[phase]}</Fragment>}
      >
        <div className="flex flex-col gap-6">
          {breadcrumb}

          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-2">
              <Badge className="w-fit gap-2 px-3 py-1">
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASSNAME[tone])} />
                {label}
              </Badge>
              {real ? (
                <EditableName id={id} name={name} />
              ) : (
                <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{name}</h1>
              )}
              <p className="text-ink-400 text-sm">&ldquo;{brief}&rdquo;</p>
            </div>

            {phase === "rules" && (
              <button
                type="button"
                onClick={confirm}
                disabled={confirming}
                className={cn(
                  buttonVariants({ intent: "dark", size: "compact" }),
                  "h-11 gap-2 px-5 disabled:opacity-70"
                )}
              >
                {confirming && <PiCircleNotch aria-hidden="true" className="animate-spin" />}
                {coverage?.basis === "fallback" ? "Confirm with these stocks" : "Confirm rules"}
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

          {phase === "rules" && <CoverageNotice coverage={coverage} brief={brief} />}

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
            <div ref={research} className="animate-fade-up flex scroll-mt-[calc(var(--shell-top)+1rem)] flex-col gap-4">
              <CoverageStrip coverage={coverage} />
              {real && run?.mode === "waiting" ? (
                <ResearchWaiting
                  id={id}
                  running={phase === "researching"}
                  runner={run.runner}
                  failure={run.error}
                  progress={run.progress}
                  onDone={finish}
                />
              ) : (
                <ResearchProgress
                  running={phase === "researching"}
                  startedAt={run?.startedAt}
                  readyAt={run?.readyAt}
                  onDone={finish}
                />
              )}
              {phase === "researching" && real && <LeaveNotice />}
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
              <CoverageStrip coverage={coverage} />
              {report}
            </div>
          )}
        </div>
      </FlowLayout>
    </DraftFlowProvider>
  )
}
