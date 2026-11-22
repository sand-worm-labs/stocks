import type { CSSProperties } from "react"

import type { BriefReview } from "@/lib/brief/types"

import { BriefControls } from "./BriefControls"

const INTRO: Record<BriefReview["status"], string> = {
  ready: "Filled in from what you wrote. Check them.",
  "needs-answers": "Before I research, I need 3 answers. Tap one each, or type your own.",
  unrealistic: "I can't aim for that honestly",
}

export function BriefReviewPanel({ review }: { review: BriefReview }) {
  return (
    <section className="flex flex-col gap-4">
      <p className="animate-fade-up text-sm font-medium">{INTRO[review.status]}</p>
      {review.concern && <p className="animate-fade-up text-ink-400 text-sm">{review.concern}</p>}

      <BriefControls fields={review.understood} />

      {review.questions.map(({ id, text, options, hint }, i) => (
        <div
          key={id}
          style={{ "--index": review.understood.length + i + 1 } as CSSProperties}
          className="animate-fade-up flex flex-col gap-2"
        >
          <p className="text-sm font-medium">{text}</p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className="border-border hover:border-primary dark:border-border-tertiary rounded-full border px-3.5 py-1.5 text-sm transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-ink-400 text-xs">{hint}</p>
        </div>
      ))}

      {!!review.alternatives.length && (
        <div
          style={{ "--index": review.understood.length + 1 } as CSSProperties}
          className="animate-fade-up flex flex-col gap-2"
        >
          <p className="text-sm font-medium">Want to try one of these instead?</p>
          <div className="flex flex-wrap gap-2">
            {review.alternatives.map((option) => (
              <button
                key={option}
                type="button"
                className="border-border hover:border-primary dark:border-border-tertiary rounded-full border px-3.5 py-1.5 text-sm transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-ink-400 text-xs">
            I&apos;ll show the worst drop next to every return, whichever you pick.
          </p>
        </div>
      )}
    </section>
  )
}
