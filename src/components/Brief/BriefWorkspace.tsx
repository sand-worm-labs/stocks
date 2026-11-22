"use client"

import { useCallback, useMemo, useState } from "react"

import { analyzeBrief } from "@/lib/brief/analyze"
import { parseBrief } from "@/lib/brief/parse"
import { applyChange } from "@/lib/brief/patch"
import type { BriefChange } from "@/lib/brief/types"

import { BriefControls } from "./BriefControls"
import { BriefFeedback } from "./BriefFeedback"
import { BriefInput } from "./BriefInput"

type BriefWorkspaceProps = { initialText: string; portfolioId: string; examples: string[] }

// The brief, and what the agent makes of it. The words are the one source of truth: everything else is read from them,
// and a change to a control is written back into them, so what you typed and what the controls say can't disagree.
export function BriefWorkspace({ initialText, portfolioId, examples }: BriefWorkspaceProps) {
  const [text, setText] = useState(initialText)
  const analysis = useMemo(() => analyzeBrief(text), [text])

  // Read from the latest words, not the ones this was made with, so changes that come close together can't undo each other
  const change = useCallback(
    (edit: BriefChange) => setText((current) => applyChange(current, parseBrief(current), edit)),
    []
  )

  const { status, missing } = analysis
  const canContinue = status === "ready" || status === "needs-answers"

  return (
    <>
      <BriefInput
        value={text}
        onChange={setText}
        canContinue={canContinue}
        portfolioId={portfolioId}
        actionLabel={status === "needs-answers" ? "Research with these answers" : "Continue"}
      />
      <section className="flex flex-col gap-4">
        <BriefFeedback analysis={analysis} examples={examples} onReplace={setText} onChange={change} />
        {status !== "empty" && <BriefControls fields={analysis.fields} onChange={change} />}
      </section>
      <span className="sr-only" aria-live="polite">
        {missing.length ? `${missing.length} to answer` : ""}
      </span>
    </>
  )
}
