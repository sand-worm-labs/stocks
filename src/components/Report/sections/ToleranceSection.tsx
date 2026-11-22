import { AppLink } from "@/components/AppLink/AppLink"
import { formatPercent } from "@/lib/format"
import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"

import { ReportSection } from "../ReportSection"

type ToleranceSectionProps = { report: Report; portfolioId: string }

// How far down the portfolio fell, against the loss its owner said they could live with
export function ToleranceSection({ report: { tolerance, version }, portfolioId }: ToleranceSectionProps) {
  const { panic, worst, fits, text } = tolerance
  const scale = Math.min(Math.abs(worst), 1) * 100

  return (
    <ReportSection title="Would you have stuck with it?" term="Risk tolerance">
      <p className="text-sm">{text}</p>
      <div
        className="bg-inputBg relative h-3 rounded-full dark:bg-white/10"
        role="img"
        aria-label={`Worst drop ${formatPercent(worst)} against the ${formatPercent(panic)} you'd panic at`}
      >
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", fits ? "bg-emerald-600" : "bg-red-600")}
          style={{ width: `${scale}%` }}
        />
        <span className="bg-ink-100 absolute -inset-y-1 w-0.5" style={{ left: `${Math.abs(panic) * 100}%` }} />
      </div>
      <div className="text-ink-400 flex justify-between text-xs">
        <span>0%</span>
        <span>{formatPercent(panic)} you&apos;d panic</span>
        <span>{formatPercent(worst)} worst drop</span>
      </div>
      {!fits && version === 1 && (
        <AppLink route="adapt" slug={portfolioId} className="text-primary text-sm font-medium hover:underline">
          Show me a version that fits
        </AppLink>
      )}
    </ReportSection>
  )
}
