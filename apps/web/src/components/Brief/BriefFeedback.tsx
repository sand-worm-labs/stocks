"use client"

import type { CSSProperties } from "react"

import { CHIP, QUESTIONS } from "@/constants/components/brief/brief-feedback"
import type { BriefAnalysis, BriefChange } from "@/types/brief"

type BriefFeedbackProps = {
  analysis: BriefAnalysis
  examples: string[]
  onReplace: (text: string) => void
  onChange: (change: BriefChange) => void
}

const stagger = (index: number) => ({ "--index": index }) as CSSProperties

export function BriefFeedback({
  analysis: { status, issues, missing },
  examples,
  onReplace,
  onChange,
}: BriefFeedbackProps) {
  if (status === "empty" || status === "unreadable") {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        <p className="animate-fade-up text-sm font-medium">
          {status === "empty"
            ? "Say what you want, or start from one of these."
            : "I couldn't find an investing goal in that."}
        </p>
        {status === "unreadable" && (
          <p className="animate-fade-up text-ink-400 text-sm" style={stagger(1)}>
            Tell me how much, for how long and what you can stomach losing. Something like:
          </p>
        )}
        <div className="animate-fade-up flex flex-col items-start gap-2" style={stagger(2)}>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => onReplace(example)} className={CHIP}>
              {example}
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (status === "unrealistic") {
    return (
      <section className="flex flex-col gap-4" aria-live="polite">
        <p className="animate-fade-up text-sm font-medium">I can&apos;t aim for that honestly.</p>
        {issues.map(({ message, fixes }, i) => (
          <div key={message} className="animate-fade-up flex flex-col gap-2" style={stagger(i + 1)}>
            <p className="text-ink-400 text-sm">{message}</p>
            <p className="text-sm font-medium">Want to try one of these instead?</p>
            <div className="flex flex-col items-start gap-2">
              {fixes.map((fix) => (
                <button key={fix} type="button" onClick={() => onReplace(fix)} className={CHIP}>
                  {fix}
                </button>
              ))}
            </div>
            <p className="text-ink-400 text-xs">
              I&apos;ll show the worst drop next to every return, whichever you pick.
            </p>
          </div>
        ))}
      </section>
    )
  }

  if (status === "needs-answers") {
    return (
      <section className="flex flex-col gap-4" aria-live="polite">
        <p className="animate-fade-up text-sm font-medium">
          Filled in from what you wrote. Before I research, I need{" "}
          {missing.length === 1 ? "1 answer" : `${missing.length} answers`}. Tap one each, or type it above.
        </p>
        {missing.map((field, i) => {
          const { text, hint, answers } = QUESTIONS[field]

          return (
            <div key={field} className="animate-fade-up flex flex-col gap-2" style={stagger(i + 1)}>
              <p className="text-sm font-medium">{text}</p>
              <div className="flex flex-wrap gap-2">
                {answers.map(({ label, change }) => (
                  <button key={label} type="button" onClick={() => onChange(change)} className={CHIP}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-ink-400 text-xs">{hint}</p>
            </div>
          )
        })}
      </section>
    )
  }

  return (
    <p className="animate-fade-up text-sm font-medium" aria-live="polite">
      Filled in from what you wrote. Check them.
    </p>
  )
}
