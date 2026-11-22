import type { Report } from "@/lib/report/types"

import { VerdictPill } from "./VerdictPill"

type ReportHeaderProps = { report: Report; eyebrow: string }

export function ReportHeader({ report: { verdict, headline }, eyebrow }: ReportHeaderProps) {
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
    </header>
  )
}
