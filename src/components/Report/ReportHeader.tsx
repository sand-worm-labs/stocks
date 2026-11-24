import type { Report } from "@/lib/report/types"

import { VerdictPill } from "./VerdictPill"

type ReportHeaderProps = { report: Report; eyebrow: string }

export function ReportHeader({ report: { verdict, headline, preview }, eyebrow }: ReportHeaderProps) {
  return (
    <header className="flex flex-col gap-2.5">
      <p className="text-ink-200 flex items-center gap-2 text-xs font-medium tracking-[0.08em] uppercase">
        <span aria-hidden="true" className="bg-ink-200 size-[5px] rounded-full" />
        {eyebrow}
      </p>
      <h1 className="text-2xl font-medium tracking-tight md:text-[30px] md:leading-[38px]">{headline}</h1>
      <div>
        <VerdictPill verdict={verdict} prefix="Edge or gambling: " />
      </div>
      {preview && (
        <p
          role="note"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-900 dark:text-amber-300"
        >
          <strong className="font-medium">Example results.</strong> Sandworm&apos;s research agent isn&apos;t connected
          yet, so the figures below are a template, not a test of this strategy. The stocks, amounts and rules are
          yours.
        </p>
      )}
    </header>
  )
}
